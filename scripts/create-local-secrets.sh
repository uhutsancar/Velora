#!/usr/bin/env bash
# Yerel Kubernetes namespace'ine uygulama sirlarini olusturur.
#
# Degerler .env dosyasindan gelir ve KUME ICINDE kalir; hicbiri depoya yazilmaz.
# Prod'da bu isi External Secrets Operator yapar (bkz. plan 6.6) - orada da ham
# Secret manifesti Git'e girmez, fark yalnizca sirlarin nereden cekildigidir.
set -euo pipefail

NS="${1:-velora-local}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$ROOT/.env" ]]; then
  echo ".env bulunamadi: $ROOT/.env" >&2
  exit 1
fi

set -a; . "$ROOT/.env"; set +a

sql() { echo "Server=sql,1433;Database=$1;User Id=sa;Password=${SQL_SA_PASSWORD};TrustServerCertificate=True;Encrypt=False;"; }

apply() {
  local name="$1"; shift
  kubectl create secret generic "$name" -n "$NS" "$@" --dry-run=client -o yaml | kubectl apply -f -
}

# Tum servislerin paylastigi: JWT imza anahtari ve broker kimlik bilgileri.
apply velora-common-secrets \
  --from-literal=AuthConfig__Secret="${AUTH_SIGNING_KEY}" \
  --from-literal=EventBus__UserName="${RABBITMQ_USER}" \
  --from-literal=EventBus__Password="${RABBITMQ_PASSWORD}"

apply velora-identity-secrets \
  --from-literal=ConnectionStrings__IdentityConnection="$(sql velora_identity)" \
  --from-literal=SeedAdmin__Password="${SEED_ADMIN_PASSWORD}"

apply velora-catalog-secrets \
  --from-literal=ConnectionStrings__CatalogConnection="$(sql velora_catalog)"

# OrderService baglanti dizesini duz bir anahtarda tutar, ConnectionStrings
# altinda degil; asagidaki isim bilerek digerlerinden farkli.
apply velora-order-secrets \
  --from-literal=OrderDbConnectionString="$(sql velora_order)"

apply velora-basket-secrets \
  --from-literal=RedisSettings__ConnectionString="redis:6379,password=${REDIS_PASSWORD},abortConnect=false"

# Payment'in kendi veri deposu yok; yalnizca ortak sirlari kullanir.
apply velora-payment-secrets --from-literal=PLACEHOLDER=unused

echo "Sirlar '$NS' namespace'inde olusturuldu."
