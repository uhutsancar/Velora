"""Concurrent live checkout and RabbitMQ contention verification.

This is intentionally a small, repeatable local baseline rather than a claim
about production capacity.  It creates one temporary product whose stock is
lower than the number of simultaneous checkouts and proves that:

* exactly the available quantity is paid;
* excess demand is rejected either synchronously (HTTP 409) or by the saga;
* all expected RabbitMQ consumers process their messages;
* no subscriber backlog or dead-letter growth remains;
* acceptance and end-to-end p50/p95/p99 timings are printed.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
import base64
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


GW = os.environ.get("VELORA_GATEWAY", "http://127.0.0.1:30000").rstrip("/")
MGMT = os.environ.get("VELORA_RABBITMQ", "http://127.0.0.1:15672").rstrip("/")
MGMT_USER = os.environ.get("VELORA_RABBITMQ_USER", "guest")
MGMT_PASS = os.environ.get("VELORA_RABBITMQ_PASSWORD", "guest")
VHOST = os.environ.get("VELORA_RABBITMQ_VHOST", "/")
ADMIN_EMAIL = os.environ.get("VELORA_ADMIN_EMAIL", "admin@velora.com")
ADMIN_PASSWORD = os.environ["VELORA_ADMIN_PASSWORD"]
ATTEMPTS = int(os.environ.get("VELORA_LOAD_ATTEMPTS", "5"))
CAPACITY = int(os.environ.get("VELORA_LOAD_CAPACITY", "4"))

if ATTEMPTS < 2 or CAPACITY < 1 or CAPACITY >= ATTEMPTS:
    raise SystemExit("VELORA_LOAD_CAPACITY, 1 ile ATTEMPTS-1 arasinda olmali")

EXPECTED_DELTAS = {
    "BasketService.OrderCreated": ATTEMPTS,
    "CatalogService.OrderCreated": ATTEMPTS,
    "OrderService.OrderCreated": ATTEMPTS,
    "OrderService.StockReservationConfirmed": CAPACITY,
    "OrderService.StockReservationRejected": ATTEMPTS - CAPACITY,
    "PaymentService.OrderStarted": CAPACITY,
    "OrderService.OrderPaymentSuccess": CAPACITY,
    "NotificationService.OrderPaymentSuccess": CAPACITY,
    "NotificationService.OrderStatusChanged": ATTEMPTS,
    "CatalogService.OrderPaid": CAPACITY,
    "NotificationService.OrderPaid": CAPACITY,
}

ok = 0
fail = 0


def check(name, condition, detail=""):
    global ok, fail
    if condition:
        ok += 1
        print("  [OK]   %s %s" % (name, detail))
    else:
        fail += 1
        print("  [FAIL] %s %s" % (name, detail))
    return condition


def call(path, method="GET", body=None, token=None, headers=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(GW + path, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", "Bearer " + token)
    for name, value in (headers or {}).items():
        request.add_header(name, value)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            return error.code, json.loads(raw)
        except ValueError:
            return error.code, raw


def mgmt(path):
    request = urllib.request.Request(MGMT + path)
    auth = base64.b64encode((MGMT_USER + ":" + MGMT_PASS).encode()).decode()
    request.add_header("Authorization", "Basic " + auth)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def queue_stats():
    encoded = urllib.parse.quote(VHOST, safe="")
    result = {}
    for queue in mgmt("/api/queues/" + encoded):
        result[queue["name"]] = {
            "delivered": queue.get("message_stats", {}).get("deliver_get", 0),
            "ready": queue.get("messages", 0),
            "unacked": queue.get("messages_unacknowledged", 0),
            "consumers": queue.get("consumers", 0),
        }
    return result


def wait_idle(timeout=120, minimum_wait=6):
    started = time.time()
    deadline = time.time() + timeout
    while time.time() < deadline:
        current = queue_stats()
        busy = {
            name: (value["ready"], value["unacked"])
            for name, value in current.items()
            if name in EXPECTED_DELTAS and (value["ready"] or value["unacked"])
        }
        # RabbitMQ management statistics are sampled asynchronously.  Waiting
        # for one sampling interval avoids reading a zero delta immediately
        # after fast consumers have already emptied their queues.
        if not busy and time.time() - started >= minimum_wait:
            return current
        time.sleep(1)
    return queue_stats()


def percentile(values, percentage):
    ordered = sorted(values)
    index = max(0, math.ceil(len(ordered) * percentage) - 1)
    return ordered[index]


def timing(name, values):
    print(
        "  %-22s p50=%6.3fs p95=%6.3fs p99=%6.3fs max=%6.3fs"
        % (name, percentile(values, 0.50), percentile(values, 0.95),
           percentile(values, 0.99), max(values))
    )


print("HAZIRLIK")
status, admin = call("/auth/login", "POST", {"userName": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
if not check("admin girisi", status == 200):
    raise SystemExit(1)
admin_token = admin["accessToken"]

status, categories = call("/admin/categories", token=admin_token)
check("kategori okundu", status == 200 and categories)
status, brands = call("/admin/brands", token=admin_token)
check("marka okundu", status == 200 and brands)

stamp = int(time.time())
product_request = {
    "name": "Canli Yuk Testi %s" % stamp,
    "description": "Eszamanli stok rezervasyonu ve mesaj zinciri icin gecici canli test urunu.",
    "shortDescription": "Canli test urunu",
    "price": 1000,
    "discountPrice": None,
    "costPrice": 500,
    "categoryId": categories[0]["id"],
    "catalogBrandId": brands[0]["id"],
    "catalogTypeId": 1,
    "availableStock": CAPACITY,
    "restockThreshold": 1,
    "isPublished": True,
    "isFeatured": False,
    "tags": ["live-test"],
    "images": [{
        "url": "https://picsum.photos/seed/velora-live-load/800/1000",
        "altText": "canli test",
        "displayOrder": 0,
        "isPrimary": True,
    }],
    "variants": [],
}
status, created = call("/admin/products", "POST", product_request, admin_token)
if not check("gecici urun olusturuldu", status == 201, "(HTTP %s)" % status):
    raise SystemExit(1)
product_id, slug = created["id"], created["slug"]
status, product = call("/products/" + slug)
if not check("gecici urun yayinda", status == 200 and product["totalStock"] == CAPACITY):
    raise SystemExit(1)

before = wait_idle()
barrier = __import__("threading").Barrier(ATTEMPTS)

# Authentication has its own intentionally strict gateway rate limit.  User
# creation is setup, not the operation under load, so prepare the identities
# before releasing the concurrent checkout requests.  A previous verification
# run may have consumed the current one-minute registration window.
load_tokens = {}
for index in range(ATTEMPTS):
    email = "load-%s-%s@velora.test" % (stamp, index)
    deadline = time.time() + 90
    while True:
        status, registration = call("/auth/register", "POST", {
            "email": email,
            "password": "VeloraLoad2026",
            "firstName": "Load",
            "lastName": "Test%s" % index,
        })
        if status == 200:
            load_tokens[index] = registration["accessToken"]
            break
        if status == 429 and time.time() < deadline:
            time.sleep(2)
            continue
        load_tokens[index] = None
        break


def checkout(index):
    token = load_tokens[index]
    if token is None:
        return {"index": index, "error": "register rate-limit timeout"}

    status, basket = call("/basket/additem", "POST", {
        "productId": product_id,
        "productName": product["name"],
        "unitPrice": product["effectivePrice"],
        "oldUnitPrice": product["price"],
        "quantity": 1,
        "pictureUrl": product["primaryImageUrl"],
        "slug": slug,
        "variantId": None,
        "variantLabel": None,
        "availableStock": CAPACITY,
    }, token)
    if status != 200:
        return {"index": index, "error": "basket HTTP %s" % status}

    barrier.wait(timeout=45)
    started = time.perf_counter()
    status, _ = call("/basket/checkout", "POST", {
        "city": "Istanbul",
        "street": "Canli Test Caddesi 1",
        "state": "Kadikoy",
        "country": "Turkiye",
        "zipCode": "34710",
        "paymentProvider": "sandbox",
        "paymentMethodToken": "sandbox_approved_load_%s" % index,
    }, token, {"x-request-id": str(uuid.uuid4())})
    accepted = time.perf_counter()
    if status != 202:
        return {
            "index": index,
            "sync_rejected": status == 409,
            "error": "checkout HTTP %s" % status,
        }

    deadline = time.time() + 120
    final_status = None
    while time.time() < deadline:
        order_status, orders = call("/orders?pageSize=2", token=token)
        if order_status == 200 and orders["items"]:
            final_status = str(orders["items"][0]["status"]).lower()
            if final_status in ("paid", "cancelled"):
                break
        time.sleep(0.5)

    finished = time.perf_counter()
    return {
        "index": index,
        "status": final_status,
        "accept_seconds": accepted - started,
        "settle_seconds": finished - started,
    }


print("ESZAMANLI CHECKOUT (%s istek / %s stok)" % (ATTEMPTS, CAPACITY))
results = []
with ThreadPoolExecutor(max_workers=ATTEMPTS) as pool:
    futures = [pool.submit(checkout, index) for index in range(ATTEMPTS)]
    for future in as_completed(futures):
        try:
            results.append(future.result())
        except Exception as error:  # test must report every worker, not stop early
            results.append({"error": repr(error)})

errors = [result for result in results if result.get("error")]
sync_rejected = [result for result in results if result.get("sync_rejected")]
paid = [result for result in results if result.get("status") == "paid"]
cancelled = [result for result in results if result.get("status") == "cancelled"]
unexpected_errors = [result for result in errors if not result.get("sync_rejected")]
check("istekler kabul veya stok-guvenli 409", not unexpected_errors,
      "(%s kabul, %s HTTP 409)" % (ATTEMPTS - len(errors), len(sync_rejected)))
if unexpected_errors:
    for error in unexpected_errors:
        print("         %s" % error["error"])
check("stok kadar siparis paid", len(paid) == CAPACITY, "(%s/%s)" % (len(paid), CAPACITY))
check("fazla talep stoktan reddedildi", len(cancelled) + len(sync_rejected) == ATTEMPTS - CAPACITY,
      "(%s/%s)" % (len(cancelled) + len(sync_rejected), ATTEMPTS - CAPACITY))

accepted_count = ATTEMPTS - len(errors)
EXPECTED_DELTAS.update({
    "BasketService.OrderCreated": accepted_count,
    "CatalogService.OrderCreated": accepted_count,
    "OrderService.OrderCreated": accepted_count,
    "OrderService.StockReservationConfirmed": len(paid),
    "OrderService.StockReservationRejected": len(cancelled),
    "PaymentService.OrderStarted": len(paid),
    "OrderService.OrderPaymentSuccess": len(paid),
    "NotificationService.OrderPaymentSuccess": len(paid),
    "NotificationService.OrderStatusChanged": accepted_count,
    "CatalogService.OrderPaid": len(paid),
    "NotificationService.OrderPaid": len(paid),
})

settled = [result for result in results if result.get("accept_seconds") is not None]
if settled:
    print("GECIKME")
    timing("checkout kabul", [result["accept_seconds"] for result in settled])
    timing("nihai durum", [result["settle_seconds"] for result in settled])

after = wait_idle()
print("RABBITMQ MESAJ SAYACLARI")
for queue, expected in EXPECTED_DELTAS.items():
    delta = after.get(queue, {}).get("delivered", 0) - before.get(queue, {}).get("delivered", 0)
    check(queue, delta == expected, "(+%s, beklenen +%s)" % (delta, expected))

backlog = {
    name: (value["ready"], value["unacked"])
    for name, value in after.items()
    if name in EXPECTED_DELTAS and (value["ready"] or value["unacked"])
}
check("abone kuyruklari bos", not backlog, str(backlog) if backlog else "")

dlq_growth = {
    name: value["ready"] - before.get(name, {}).get("ready", 0)
    for name, value in after.items()
    if name.endswith(".dlx") and value["ready"] > before.get(name, {}).get("ready", 0)
}
check("dead-letter artisi yok", not dlq_growth, str(dlq_growth) if dlq_growth else "")

status, product_after = call("/products/" + slug)
check("stok sifirin altina inmedi", status == 200 and product_after["totalStock"] == 0,
      "(stok %s)" % product_after.get("totalStock") if status == 200 else "")

cleanup_status, _ = call("/admin/products/%s" % product_id, "DELETE", token=admin_token)
check("gecici urun temizlendi", cleanup_status == 204, "(HTTP %s)" % cleanup_status)

print("\nSONUC: %s gecti, %s basarisiz" % (ok, fail))
raise SystemExit(1 if fail else 0)
