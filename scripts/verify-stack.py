"""
End-to-end verification of the Velora stack through the API gateway.

Walks the whole commercial chain against the running services:

    catalogue -> register -> basket -> coupon -> checkout -> order -> admin

Every call goes through Ocelot, so a pass proves gateway routing, Consul
discovery, JWT issuance, Redis, RabbitMQ and both SQL databases work together -
not merely that the processes started.

Usage:
    python scripts/verify-stack.py                     # gateway on :5000
    VELORA_GATEWAY=http://127.0.0.1:5010 python ...    # custom port
"""

import os

import json
import time
import urllib.error
import urllib.request

GW = os.environ.get("VELORA_GATEWAY", "http://127.0.0.1:5000").rstrip("/")

# Kimlik bilgileri depoda tutulmaz; .env dosyasindan gelir.
ADMIN_EMAIL = os.environ.get("VELORA_ADMIN_EMAIL", "admin@velora.com")
ADMIN_PASSWORD = os.environ["VELORA_ADMIN_PASSWORD"]

ok = 0
fail = 0


def call(path, method="GET", body=None, token=None):
    url = GW + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
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
        except Exception:
            return e.code, raw


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
        print("  [OK]   %s %s" % (name, extra))
    else:
        fail += 1
        print("  [FAIL] %s %s" % (name, extra))


print("KATALOG")
s, p = call("/products?pageSize=5")
check("GET /products", s == 200 and p["totalCount"] > 0, "(%s urun)" % p["totalCount"] if s == 200 else s)
s, c = call("/categories")
check("GET /categories", s == 200 and len(c) == 4, "(%s kok)" % len(c) if s == 200 else s)
s, b = call("/brands")
check("GET /brands", s == 200 and len(b) > 0, "(%s)" % len(b) if s == 200 else s)
s, cm = call("/campaigns?placement=Hero")
check("GET /campaigns", s == 200 and len(cm) > 0, "(%s)" % len(cm) if s == 200 else s)

prod = p["items"][0]
s, pd = call("/products/%s" % prod["slug"])
check("GET /products/{slug}", s == 200 and pd["id"] == prod["id"])
s, f = call("/products/facets")
check("GET /products/facets", s == 200 and len(f["brands"]) > 0)
s, _ = call("/products/featured?take=4")
check("GET /products/featured", s == 200)
s, _ = call("/products/new-arrivals?take=4")
check("GET /products/new-arrivals", s == 200)
s, _ = call("/products/best-sellers?take=4")
check("GET /products/best-sellers", s == 200)
s, _ = call("/products/%s/related" % prod["slug"])
check("GET /products/{slug}/related", s == 200)
s, _ = call("/products?search=canta")
check("GET /products?search", s == 200)
s, _ = call("/products?onSale=true&sort=1")
check("GET /products filter+sort", s == 200)

print("KIMLIK")
stamp = int(time.time())
email = "gw.%s@velora.test" % stamp
s, reg = call("/auth/register", "POST", {"email": email, "password": "VeloraGw2026", "firstName": "Gw", "lastName": "Test"})
check("POST /auth/register", s == 200 and reg["user"]["roles"] == ["Customer"])
tok = reg["accessToken"]

s, me = call("/auth/me", token=tok)
check("GET /auth/me", s == 200 and me["email"] == email)
s, rf = call("/auth/refresh", "POST", {"refreshToken": reg["refreshToken"]})
check("POST /auth/refresh", s == 200 and bool(rf.get("accessToken")))
if s == 200:
    tok = rf["accessToken"]
s, _ = call("/auth/login", "POST", {"userName": email, "password": "WRONG"})
check("login wrong password -> 401", s == 401, "(got %s)" % s)
s, _ = call("/addresses", "POST", {"title": "Ev", "firstName": "Gw", "lastName": "Test", "phone": "05555555555", "street": "Karakoy Cad 12", "city": "Istanbul", "state": "Beyoglu", "country": "Turkiye", "zipCode": "34425", "isDefault": True}, tok)
check("POST /addresses", s == 201, "(got %s)" % s)
s, al = call("/addresses", token=tok)
check("GET /addresses", s == 200 and len(al) == 1)

print("SEPET")
s, bk = call("/basket/additem", "POST", {"productId": prod["id"], "productName": prod["name"], "unitPrice": prod["effectivePrice"], "oldUnitPrice": prod["price"], "quantity": 2, "pictureUrl": prod["primaryImageUrl"], "slug": prod["slug"], "availableStock": prod["totalStock"]}, tok)
check("POST /basket/additem", s == 200 and len(bk["items"]) == 1, "(subtotal %s)" % bk["subtotal"] if s == 200 else s)
s, bk2 = call("/basket/me", token=tok)
check("GET /basket/me", s == 200 and bk2["totalQuantity"] == 2)
line = bk2["items"][0]["id"]
s, bk3 = call("/basket/items/%s" % line, "PUT", {"quantity": 3}, tok)
check("PUT /basket/items/{id}", s == 200 and bk3["totalQuantity"] == 3)
s, bk4 = call("/basket/items/%s" % line, "PUT", {"quantity": 2}, tok)
check("quantity back to 2", s == 200 and bk4["totalQuantity"] == 2)
s, cv = call("/coupons/validate", "POST", {"code": "VELORA10", "subtotal": bk4["subtotal"]}, tok)
check("POST /coupons/validate", s == 200 and cv["isValid"], "(indirim %s)" % cv.get("discountAmount"))
s, cv2 = call("/coupons/validate", "POST", {"code": "YOKBOYLE", "subtotal": 1000}, tok)
check("invalid coupon rejected", s == 200 and not cv2["isValid"])
s, bk5 = call("/basket/coupon", "POST", {"code": cv["code"], "discountAmount": cv["discountAmount"]}, tok)
check("POST /basket/coupon", s == 200 and bk5["discountAmount"] > 0, "(total %s)" % bk5["total"] if s == 200 else s)
s, wl = call("/basket/wishlist/%s" % prod["id"], "POST", token=tok)
check("POST /basket/wishlist/{id}", s == 200 and prod["id"] in wl["productIds"])
s, wl2 = call("/basket/wishlist", token=tok)
check("GET /basket/wishlist", s == 200 and len(wl2["productIds"]) == 1)

print("SIPARIS SAGA")
s, _ = call("/basket/checkout", "POST", {"city": "Istanbul", "street": "Karakoy Cad 12", "state": "Beyoglu", "country": "Turkiye", "zipCode": "34425", "cardNumber": "4242424242424242", "cardHolderName": "GW TEST", "cardExpiration": "2028-12-31T23:59:59Z", "cardSecurityNumber": "123", "cardTypeId": 2, "buyer": ""}, tok)
check("POST /basket/checkout", s == 202, "(got %s)" % s)

order = None
for _ in range(20):
    time.sleep(3)
    s, od = call("/orders?pageSize=5", token=tok)
    if s == 200 and od["items"]:
        order = od["items"][0]
        break
check("siparis olustu", order is not None, "(%s)" % order["orderNumber"] if order else "")

if order:
    # Give the payment saga a moment to move the order past Submitted.
    detail = None
    for _ in range(15):
        s, detail = call("/orders/%s" % order["id"], token=tok)
        if s == 200 and detail["status"] == "paid":
            break
        time.sleep(2)
    check("GET /orders/{id}", s == 200 and detail["ordernumber"] == order["orderNumber"], "(indirim %s)" % detail["discountAmount"])
    check("odeme sagasi tamamlandi", detail["status"] == "paid", "(durum %s)" % detail["status"])

s, bk6 = call("/basket/me", token=tok)
check("sepet temizlendi", s == 200 and len(bk6["items"]) == 0)
s, pp = call("/products/%s" % prod["slug"])
check("stok dustu", pp["totalStock"] < prod["totalStock"], "(%s -> %s)" % (prod["totalStock"], pp["totalStock"]))

print("YETKI")
s, _ = call("/admin/products")
check("token'siz admin -> 401", s in (401, 403), "(got %s)" % s)
s, _ = call("/admin/products", token=tok)
check("musteri token'i admin'e giremiyor", s in (401, 403), "(got %s)" % s)
s, _ = call("/admin/analytics/dashboard", token=tok)
check("musteri analytics'e giremiyor", s in (401, 403), "(got %s)" % s)

print("YONETIM")
s, adm = call("/auth/login", "POST", {"userName": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
check("admin login", s == 200 and "Admin" in adm["user"]["roles"])
atok = adm["accessToken"]

s, ap = call("/admin/products?pageSize=5", token=atok)
check("GET /admin/products", s == 200 and ap["totalCount"] > 0, "(%s)" % ap["totalCount"] if s == 200 else s)
s, st = call("/admin/products/stats", token=atok)
check("GET /admin/products/stats", s == 200 and st["totalProducts"] > 0, "(stok degeri %s)" % st["inventoryValue"] if s == 200 else s)
s, dsh = call("/admin/analytics/dashboard?days=30", token=atok)
check("GET /admin/analytics/dashboard", s == 200 and dsh["summary"] is not None, "(ciro %s, siparis %s)" % (dsh["summary"]["totalRevenue"], dsh["summary"]["totalOrders"]) if s == 200 else s)
if s == 200:
    check("dashboard serisi dolu", len(dsh["salesSeries"]) > 0, "(%s gun)" % len(dsh["salesSeries"]))
    check("en cok satanlar dolu", len(dsh["topProducts"]) > 0, "(%s)" % len(dsh["topProducts"]))
s, ao = call("/admin/orders?pageSize=5", token=atok)
check("GET /admin/orders", s == 200 and ao["totalCount"] > 0, "(%s)" % ao["totalCount"] if s == 200 else s)
s, us = call("/users?pageSize=5", token=atok)
check("GET /users", s == 200 and us["totalCount"] > 0, "(%s)" % us["totalCount"] if s == 200 else s)
s, _ = call("/users/stats", token=atok)
check("GET /users/stats", s == 200)
s, rls = call("/roles", token=atok)
check("GET /roles", s == 200 and len(rls) == 3, "(%s)" % [r["name"] for r in rls] if s == 200 else s)
s, ac = call("/admin/categories", token=atok)
check("GET /admin/categories", s == 200 and len(ac) > 0)
s, ab = call("/admin/brands", token=atok)
check("GET /admin/brands", s == 200 and len(ab) > 0)
s, acp = call("/admin/coupons", token=atok)
check("GET /admin/coupons", s == 200 and acp["totalCount"] > 0, "(%s)" % acp["totalCount"] if s == 200 else s)
s, acm = call("/admin/campaigns", token=atok)
check("GET /admin/campaigns", s == 200 and len(acm) > 0)

print("ADMIN CRUD -> STOREFRONT")
newp = {
    "name": "Gateway Test Urunu %s" % stamp,
    "description": "Gateway uzerinden olusturulan uctan uca test urunu, aciklama yeterince uzun.",
    "shortDescription": "E2E test",
    "price": 1499, "discountPrice": 1299, "costPrice": 600,
    "categoryId": ac[0]["id"], "catalogBrandId": ab[0]["id"], "catalogTypeId": 1,
    "availableStock": 10, "restockThreshold": 2,
    "isPublished": True, "isFeatured": False,
    "tags": ["test"],
    "images": [{"url": "https://picsum.photos/seed/gwtest/800/1000", "altText": "test", "displayOrder": 0, "isPrimary": True}],
    "variants": [],
}

s, cp2 = call("/admin/products", "POST", newp, atok)
check("POST /admin/products", s == 201, "(id %s)" % cp2["id"] if s == 201 else "%s %s" % (s, cp2))

if s == 201:
    pid = cp2["id"]
    pslug = cp2["slug"]

    s, sp = call("/products/%s" % pslug)
    check("yeni urun storefront'ta", s == 200 and sp["name"] == newp["name"])

    upd = dict(newp)
    upd["name"] = newp["name"] + " (guncel)"
    upd["price"] = 1799
    s, _ = call("/admin/products/%s" % pid, "PUT", upd, atok)
    check("PUT /admin/products/{id}", s == 200, "(got %s)" % s)

    s, sp2 = call("/products/%s" % pslug)
    check("guncelleme storefront'a yansidi", s == 200 and sp2["price"] == 1799, "(fiyat %s)" % sp2["price"] if s == 200 else s)

    s, _ = call("/admin/products/%s/publish" % pid, "PUT", {"isPublished": False}, atok)
    check("PUT publish=false", s == 204, "(got %s)" % s)

    s, _ = call("/products/%s" % pslug)
    check("yayindan kalkan urun gizlendi", s == 404, "(got %s)" % s)

    call("/admin/products/%s/publish" % pid, "PUT", {"isPublished": True}, atok)

    s, _ = call("/admin/products/%s/stock" % pid, "PUT", {"availableStock": 42, "variants": []}, atok)
    check("PUT stock", s == 204, "(got %s)" % s)

    s, sp3 = call("/products/%s" % pslug)
    check("stok storefront'a yansidi", s == 200 and sp3["totalStock"] == 42, "(%s)" % sp3["totalStock"] if s == 200 else s)

    s, _ = call("/admin/products/%s" % pid, "DELETE", token=atok)
    check("DELETE /admin/products/{id}", s == 204, "(got %s)" % s)

    s, _ = call("/products/%s" % pslug)
    check("silinen urun 404", s == 404, "(got %s)" % s)

print()
print("SONUC: %s gecti, %s basarisiz" % (ok, fail))

raise SystemExit(0 if fail == 0 else 1)
