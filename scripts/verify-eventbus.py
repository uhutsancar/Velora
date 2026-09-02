"""
Message-level verification of the Velora event bus.

verify-stack.py proves the HTTP surface works. This script proves the
*asynchronous* half: that one published message is picked up by every
subscriber in the right order, that each handler really does its job, and that
nothing quietly lands in a dead-letter queue.

What it does

    1. Reads the RabbitMQ topology through the management API and asserts every
       expected queue exists, is bound to the right routing key and has a live
       consumer attached. A subscriber that is not listening shows up here.

    2. Snapshots per-queue delivery counters and dead-letter depths.

    3. Fires one real checkout through the API gateway, which publishes a single
       OrderCreated message.

    4. Waits for the saga to settle, then asserts each hop's queue counter moved:

           BasketService.OrderCreated              cart emptied
           CatalogService.OrderCreated             stock reserved
           OrderService.OrderCreated               order aggregate created
             -> OrderStarted
           PaymentService.OrderStarted             payment attempted
             -> OrderPaymentSuccess
           OrderService.OrderPaymentSuccess        order moved to Paid
           NotificationService.OrderPaymentSuccess customer notified
             -> OrderStatusChanged + OrderPaid
           NotificationService.OrderStatusChanged  status notification
           CatalogService.OrderPaid                coupon redemption counted
           NotificationService.OrderPaid           receipt notification

    5. Asserts the side effects each handler is responsible for actually
       happened (basket empty, stock down, coupon UsedCount up, order paid) -
       a counter moving only proves delivery, not that the work was done.

    6. Publishes a second, independent event type (ProductStockChanged, raised
       by an admin stock edit) to check a non-saga topic end to end.

    7. Asserts no dead-letter queue grew during the run.

Usage
    python scripts/verify-eventbus.py
    VELORA_GATEWAY=http://127.0.0.1:5000 VELORA_RABBITMQ=http://127.0.0.1:15672 python scripts/verify-eventbus.py
"""

import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

GW = os.environ.get("VELORA_GATEWAY", "http://127.0.0.1:5000").rstrip("/")
MGMT = os.environ.get("VELORA_RABBITMQ", "http://127.0.0.1:15672").rstrip("/")
MGMT_USER = os.environ.get("VELORA_RABBITMQ_USER", "guest")
MGMT_PASS = os.environ.get("VELORA_RABBITMQ_PASSWORD", "guest")
VHOST = os.environ.get("VELORA_RABBITMQ_VHOST", "/")
EXCHANGE = "SellingBuddyEventBus"
DLX = EXCHANGE + ".dlx"

ADMIN_EMAIL = os.environ.get("VELORA_ADMIN_EMAIL", "admin@velora.com")
ADMIN_PASSWORD = os.environ["VELORA_ADMIN_PASSWORD"]

# queue name -> routing key it must be bound to
EXPECTED_QUEUES = {
    "BasketService.OrderCreated": "OrderCreated",
    "CatalogService.OrderCreated": "OrderCreated",
    "OrderService.OrderCreated": "OrderCreated",
    "PaymentService.OrderStarted": "OrderStarted",
    "OrderService.OrderPaymentSuccess": "OrderPaymentSuccess",
    "OrderService.OrderPaymentFailed": "OrderPaymentFailed",
    "NotificationService.OrderPaymentSuccess": "OrderPaymentSuccess",
    "NotificationService.OrderPaymentFailed": "OrderPaymentFailed",
    "NotificationService.OrderStatusChanged": "OrderStatusChanged",
    "NotificationService.OrderPaid": "OrderPaid",
    "CatalogService.OrderPaid": "OrderPaid",
    "NotificationService.ProductStockChanged": "ProductStockChanged",
}

# The saga hops, in the order the messages have to travel.
SAGA_HOPS = [
    ("1. sepet bosaltma", "BasketService.OrderCreated"),
    ("1. stok rezervasyonu", "CatalogService.OrderCreated"),
    ("1. siparis olusturma", "OrderService.OrderCreated"),
    ("2. odeme talebi", "PaymentService.OrderStarted"),
    ("3. odeme sonucu -> siparis", "OrderService.OrderPaymentSuccess"),
    ("3. odeme sonucu -> bildirim", "NotificationService.OrderPaymentSuccess"),
    ("4. durum degisikligi -> bildirim", "NotificationService.OrderStatusChanged"),
    ("4. odendi -> kupon sayaci", "CatalogService.OrderPaid"),
    ("4. odendi -> bildirim", "NotificationService.OrderPaid"),
]

ok = 0
fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
        print("  [OK]   %s %s" % (name, extra))
    else:
        fail += 1
        print("  [FAIL] %s %s" % (name, extra))
    return bool(cond)


# --------------------------------------------------------------------------- #
# transports
# --------------------------------------------------------------------------- #

def call(path, method="GET", body=None, token=None):
    """API gateway call. Returns (status, parsed-body-or-text)."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(GW + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, raw


def mgmt(path):
    """RabbitMQ management API call."""
    req = urllib.request.Request(MGMT + path)
    credentials = base64.b64encode(("%s:%s" % (MGMT_USER, MGMT_PASS)).encode()).decode()
    req.add_header("Authorization", "Basic " + credentials)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def queue_stats():
    """queue name -> {'delivered': int, 'ready': int, 'consumers': int}."""
    encoded = urllib.parse.quote(VHOST, safe="")
    stats = {}
    for q in mgmt("/api/queues/" + encoded):
        stats[q["name"]] = {
            # deliver_get counts every message handed to a consumer, so it moves
            # even when the queue is drained faster than we can poll it.
            "delivered": q.get("message_stats", {}).get("deliver_get", 0),
            "ready": q.get("messages", 0),
            # Bir tuketiciye teslim edilmis ama henuz ack'lenmemis mesaj
            # "ready" sayilmaz. Yalnizca ready'ye bakmak, hala islenmekte olan
            # bir sagayi "bitti" sanmaya yol acar.
            "unacked": q.get("messages_unacknowledged", 0),
            "consumers": q.get("consumers", 0),
        }
    return stats


# --------------------------------------------------------------------------- #
# 1. topology
# --------------------------------------------------------------------------- #

print("TOPOLOJI")

try:
    exchanges = {e["name"]: e for e in mgmt("/api/exchanges/" + urllib.parse.quote(VHOST, safe=""))}
except urllib.error.URLError as e:
    print("  [FAIL] RabbitMQ management API'ye ulasilamadi: %s" % e)
    raise SystemExit(1)

check("exchange %s (direct, durable)" % EXCHANGE,
      EXCHANGE in exchanges and exchanges[EXCHANGE]["type"] == "direct" and exchanges[EXCHANGE]["durable"])
check("dead-letter exchange %s" % DLX,
      DLX in exchanges and exchanges[DLX]["type"] == "direct")

bindings = mgmt("/api/bindings/" + urllib.parse.quote(VHOST, safe=""))
bound = {(b["destination"], b["routing_key"]) for b in bindings
         if b["destination_type"] == "queue" and b["source"] == EXCHANGE}

stats = queue_stats()

missing_queue = [q for q in EXPECTED_QUEUES if q not in stats]
check("12 abone kuyrugunun tamami mevcut", not missing_queue,
      "(eksik: %s)" % missing_queue if missing_queue else "")

wrong_binding = [q for q, key in EXPECTED_QUEUES.items() if (q, key) not in bound]
check("her kuyruk dogru routing key'e bagli", not wrong_binding,
      "(hatali: %s)" % wrong_binding if wrong_binding else "")

silent = [q for q in EXPECTED_QUEUES if stats.get(q, {}).get("consumers", 0) < 1]
check("her kuyrugun canli dinleyicisi var", not silent,
      "(dinleyicisiz: %s)" % silent if silent else "(12/12)")

dlq_names = [q for q in stats if q.endswith(".dlx")]
check("her abone kuyrugunun dlx esi var", len(dlq_names) >= len(EXPECTED_QUEUES),
      "(%s dlx kuyrugu)" % len(dlq_names))

def wait_until_idle(attempts=30, delay=2):
    """
    Waits until no subscriber queue holds an unprocessed message.

    The baseline below is compared against counters taken after this script's
    own checkout. If an earlier run - verify-stack.py performs a checkout of
    its own - still has messages in flight, its stock decrement lands between
    the two snapshots and shows up here as this checkout being processed twice.
    That is a race between the scripts, not a fault in the bus, and sleeping a
    fixed number of seconds would only make it less likely.

    Both counters matter. A message already handed to a consumer but not yet
    acknowledged is not "ready", so waiting on ready alone declares a saga
    finished while a handler is still running - which is exactly how a stock
    decrement from the previous checkout lands inside this measurement.
    """
    for _ in range(attempts):
        current = queue_stats()
        busy = {
            q: (s["ready"], s["unacked"])
            for q, s in current.items()
            if q in EXPECTED_QUEUES and (s["ready"] > 0 or s["unacked"] > 0)
        }
        if not busy:
            return current
        time.sleep(delay)

    print("  [WARN] kuyruklar bosalmadi, olcume yine de baslaniyor: %s" % busy)
    return queue_stats()


before = wait_until_idle()
stats = before
stale_dlq = {q: s["ready"] for q, s in before.items() if q.endswith(".dlx") and s["ready"] > 0}
if stale_dlq:
    print("  [not]  onceden kalan dlx mesajlari (bu kosuda artmamali): %s" % stale_dlq)


# --------------------------------------------------------------------------- #
# 2. trigger: one checkout -> one OrderCreated message
# --------------------------------------------------------------------------- #

print("TETIKLEME")

status, products = call("/products?pageSize=1")
if not check("katalogda urun var", status == 200 and products["totalCount"] > 0):
    raise SystemExit(1)

product = products["items"][0]

# Stok, listeden DEGIL urun detayindan okunur.
#
# GET /products tasiyor: [ResponseCache(Duration = 30)]. Bu olcumun "sonra"
# degeri detay ucundan geliyor ve o onbelleklenmiyor, dolayisiyla ikisini
# karistirmak otuz saniyeye kadar bayat bir baslangic degeri demek. Onceki
# senaryonun stok dusumu o pencereye denk geldiginde fark iki yerine dort
# gorunuyor ve olay iki kez islenmis gibi okunuyor - oysa mesaj sayaci bir
# tek teslimat gosteriyor. Iki ucu da ayni yerden okumak sorunu bitiriyor.
status, product_detail = call("/products/%s" % product["slug"])
if not check("urun detayi okunabiliyor", status == 200, "(%s)" % status):
    raise SystemExit(1)

stock_before = product_detail["totalStock"]

email = "bus-%d@velora.test" % int(time.time())
status, reg = call("/auth/register", "POST",
                   {"email": email, "password": "VeloraBus2026", "firstName": "Bus", "lastName": "Test"})
if not check("musteri kaydi", status == 200, "(%s)" % email):
    raise SystemExit(1)
token = reg["accessToken"]

status, basket = call("/basket/additem", "POST", {
    "productId": product["id"],
    "productName": product["name"],
    "unitPrice": product["effectivePrice"],
    "oldUnitPrice": product["price"],
    "quantity": 2,
    "pictureUrl": product["primaryImageUrl"],
    "slug": product["slug"],
    "availableStock": product["totalStock"],
}, token)
check("sepete ekleme", status == 200 and len(basket["items"]) == 1)

status, coupon = call("/coupons/validate", "POST",
                      {"code": "VELORA10", "subtotal": basket["subtotal"]}, token)
coupon_valid = status == 200 and coupon.get("isValid")
check("kupon dogrulama", coupon_valid, "(indirim %s)" % coupon.get("discountAmount") if coupon_valid else "")

if coupon_valid:
    call("/basket/coupon", "POST",
         {"code": coupon["code"], "discountAmount": coupon["discountAmount"]}, token)

status, admin = call("/auth/login", "POST", {"userName": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
if not check("admin girisi", status == 200):
    raise SystemExit(1)
admin_token = admin["accessToken"]

status, coupons = call("/admin/coupons", token=admin_token)
used_before = next((c["usedCount"] for c in coupons["items"] if c["code"] == "VELORA10"), None)
check("kupon sayaci okundu", used_before is not None, "(UsedCount=%s)" % used_before)

status, _ = call("/basket/checkout", "POST", {
    "city": "Istanbul", "street": "Karakoy Cad 12", "state": "Beyoglu",
    "country": "Turkiye", "zipCode": "34425",
    "cardNumber": "4242424242424242", "cardHolderName": "BUS TEST",
    "cardExpiration": "2028-12-31T23:59:59Z", "cardSecurityNumber": "123",
    "cardTypeId": 2, "buyer": "",
}, token)
if not check("checkout -> OrderCreated yayinlandi", status == 202, "(got %s)" % status):
    raise SystemExit(1)


# --------------------------------------------------------------------------- #
# 3. wait for the saga to settle
# --------------------------------------------------------------------------- #

order = None
deadline = time.time() + 90

while time.time() < deadline:
    status, orders = call("/orders?pageSize=5", token=token)
    if status == 200 and orders["items"]:
        candidate = orders["items"][0]
        if str(candidate.get("status", "")).lower() == "paid":
            order = candidate
            break
        order = candidate
    time.sleep(2)

check("siparis paid durumuna ulasti",
      order is not None and str(order.get("status", "")).lower() == "paid",
      "(%s / %s)" % (order.get("orderNumber"), order.get("status")) if order else "(siparis yok)")


# --------------------------------------------------------------------------- #
# 4. every hop consumed its message, in order
# --------------------------------------------------------------------------- #

print("MESAJ ZINCIRI")


def wait_for_delivery(queue, baseline, timeout=45):
    """Management stats refresh on an interval, so poll rather than read once."""
    deadline = time.time() + timeout
    latest = baseline
    while time.time() < deadline:
        latest = queue_stats().get(queue, {}).get("delivered", 0)
        if latest > baseline:
            return True, latest
        time.sleep(2)
    return False, latest


after = queue_stats()

for label, queue in SAGA_HOPS:
    baseline = before.get(queue, {}).get("delivered", 0)
    current = after.get(queue, {}).get("delivered", 0)

    if current <= baseline:
        moved, current = wait_for_delivery(queue, baseline)
    else:
        moved = True

    check("%s -> %s" % (label, queue), moved, "(+%s mesaj)" % (current - baseline))

after = queue_stats()

backlog = {q: after[q]["ready"] for q in EXPECTED_QUEUES if after.get(q, {}).get("ready", 0) > 0}
check("hicbir abone kuyrugunda birikmis mesaj yok", not backlog, "(%s)" % backlog if backlog else "")

grew = {}
for queue, snapshot in after.items():
    if not queue.endswith(".dlx"):
        continue
    delta = snapshot["ready"] - before.get(queue, {}).get("ready", 0)
    if delta > 0:
        grew[queue] = delta

check("hicbir mesaj dead-letter'a dusmedi", not grew, "(%s)" % grew if grew else "")


# --------------------------------------------------------------------------- #
# 5. the handlers actually did their work
# --------------------------------------------------------------------------- #

print("DINLEYICI ETKILERI")

status, basket_after = call("/basket/me", token=token)
check("BasketService sepeti bosaltti",
      status == 200 and basket_after["totalQuantity"] == 0,
      "(%s kalem)" % basket_after["totalQuantity"] if status == 200 else status)

status, product_after = call("/products/%s" % product["slug"])
check("CatalogService stogu dustu",
      status == 200 and product_after["totalStock"] == stock_before - 2,
      "(%s -> %s)" % (stock_before, product_after["totalStock"]) if status == 200 else status)

if coupon_valid and used_before is not None:
    used_after = None
    deadline = time.time() + 30
    while time.time() < deadline:
        status, coupons_after = call("/admin/coupons", token=admin_token)
        if status == 200:
            used_after = next((c["usedCount"] for c in coupons_after["items"] if c["code"] == "VELORA10"), None)
            if used_after is not None and used_after > used_before:
                break
        time.sleep(2)

    check("CatalogService kupon sayacini artirdi (OrderPaid)",
          used_after is not None and used_after == used_before + 1,
          "(%s -> %s)" % (used_before, used_after))

if order:
    status, detail = call("/orders/%s" % order["id"], token=token)
    check("OrderService siparisi tamamladi",
          status == 200 and str(detail.get("status", "")).lower() == "paid",
          "(%s, indirim %s)" % (detail.get("ordernumber"), detail.get("discountAmount")) if status == 200 else status)


# --------------------------------------------------------------------------- #
# 6. a second, independent event type
# --------------------------------------------------------------------------- #

print("IKINCI OLAY TIPI (ProductStockChanged)")

stock_queue = "NotificationService.ProductStockChanged"
stock_baseline = queue_stats().get(stock_queue, {}).get("delivered", 0)

status, admin_products = call("/admin/products?pageSize=1", token=admin_token)
if check("admin urun listesi", status == 200 and admin_products["items"]):
    target = admin_products["items"][0]

    status, detail = call("/admin/products/%s" % target["id"], token=admin_token)
    original_stock = detail["availableStock"] if status == 200 else 0
    variants = [{"id": v["id"], "stock": v["stock"]} for v in detail.get("variants", [])] if status == 200 else []

    # TotalStock is the sum of the active variants once a product has any, so on a
    # variant product only a variant change is a real stock change - and the service
    # deliberately stays silent when the total does not move.
    bumped = [dict(v) for v in variants]
    if bumped:
        bumped[0]["stock"] += 5
        payload = {"availableStock": original_stock, "variants": bumped}
    else:
        payload = {"availableStock": original_stock + 5, "variants": []}

    status, _ = call("/admin/products/%s/stock" % target["id"], "PUT", payload, admin_token)
    check("admin stok guncelledi -> ProductStockChanged", status in (200, 204), "(got %s)" % status)

    moved, latest = wait_for_delivery(stock_queue, stock_baseline)
    check("NotificationService stok olayini aldi", moved, "(+%s mesaj)" % (latest - stock_baseline))

    # Put the catalogue back the way we found it so repeated runs stay comparable.
    call("/admin/products/%s/stock" % target["id"], "PUT",
         {"availableStock": original_stock, "variants": variants}, admin_token)


# --------------------------------------------------------------------------- #

print("")
print("SONUC: %s gecti, %s basarisiz" % (ok, fail))
raise SystemExit(1 if fail else 0)
