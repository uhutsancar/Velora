#!/usr/bin/env bash
# Dokuz Velora imajini yerel Docker daemon'a derler.
#
# Docker Desktop'in Kubernetes'i ayni daemon'i kullanir, dolayisiyla burada
# uretilen imajlar registry'e itilmeden pod'larda kullanilabilir
# (imagePullPolicy: Never ile birlikte).
set -u
TAG="${VELORA_TAG:-local}"
ok=0; fail=0

build() {
  local slug="$1" dockerfile="$2"
  printf '=== %-13s ' "$slug"
  if docker build -q -t "velora/${slug}:${TAG}" -f "$dockerfile" . > /dev/null 2>"/tmp/build-${slug}.err"; then
    echo "OK"; ok=$((ok+1))
  else
    echo "FAIL"; tail -5 "/tmp/build-${slug}.err"; fail=$((fail+1))
  fi
}

build gateway      SellingBuddy/src/ApiGateways/WebApiGateway/Web.ApiGateway/Dockerfile
build identity     SellingBuddy/src/Services/IdentityService/IdentityService.Api/Dockerfile
build catalog      SellingBuddy/src/Services/CatalogService/CatalogService.Api/Dockerfile
build basket       SellingBuddy/src/Services/BasketService/BasketService.Api/Dockerfile
build order        SellingBuddy/src/Services/OrderService/OrderService.Api/Dockerfile
build payment      SellingBuddy/src/Services/PaymentService/PaymentService.Api/Dockerfile
build notification SellingBuddy/src/Services/NotificationService/NotificationService/Dockerfile
build storefront   velora/apps/storefront/Dockerfile
build admin        velora/apps/admin/Dockerfile

echo
echo "SONUC: ${ok} basarili, ${fail} basarisiz"
exit $fail
