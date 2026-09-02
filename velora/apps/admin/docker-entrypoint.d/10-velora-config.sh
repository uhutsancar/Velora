#!/bin/sh
# /config.js dosyasini ortam degiskenlerinden uretir.
#
# Neden /tmp'ye yaziyor: kap kok dosya sistemi salt-okunur (readOnlyRootFilesystem).
# Bu bilincli bir guvenlik ayari ve kaldirilmamali. Bu yuzden imajdaki dosya
# SABLON olarak okunur, sonuc /tmp'ye yazilir; nginx de /config.js istegini
# oradan karsilar (bkz. nginx.conf).
#
# nginx resmi imaji /docker-entrypoint.d/*.sh dosyalarini acilista calistirir.
set -eu

TEMPLATE=/usr/share/nginx/html/config.js
OUTPUT=/tmp/config.js

[ -f "$TEMPLATE" ] || exit 0

# Verilmeyen degiskenler yer tutucu olarak kalir; uygulama o durumda derleme
# anindaki varsayilana duser (bkz. packages/shared/src/runtime.ts).
sed   -e "s|__API_URL__|${API_URL:-__API_URL__}|g"   -e "s|__MEDIA_ORIGIN__|${MEDIA_ORIGIN:-__MEDIA_ORIGIN__}|g"   -e "s|__SITE_URL__|${SITE_URL:-__SITE_URL__}|g"   -e "s|__STOREFRONT_URL__|${STOREFRONT_URL:-__STOREFRONT_URL__}|g"   "$TEMPLATE" > "$OUTPUT"

echo "velora: runtime config uretildi -> $OUTPUT"
