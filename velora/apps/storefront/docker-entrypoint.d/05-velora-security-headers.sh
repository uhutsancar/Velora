#!/bin/sh
# Renders the security-header include, filling the Content-Security-Policy with
# the API and media origins this container was started with.
#
# Why /tmp: the container root filesystem is read-only (readOnlyRootFilesystem).
# That is a deliberate hardening setting and must not be relaxed, so the image
# ships a TEMPLATE and the rendered result goes to /tmp, which nginx includes.
#
# Ordering matters. The nginx entrypoint runs /docker-entrypoint.d/*.sh in
# lexical order before starting nginx, and nginx reads its configuration once at
# start-up: this file has to exist by then or nginx refuses to boot. 05- puts it
# ahead of 10-velora-config.sh for no reason other than reading order.
set -eu

TEMPLATE=/etc/nginx/velora-security-headers.conf.template
OUTPUT=/tmp/velora-security-headers.conf

if [ ! -f "$TEMPLATE" ]; then
    echo "velora: security header template not found at $TEMPLATE" >&2
    exit 1
fi

# An unset origin falls back to the same-origin default rather than a wildcard.
# A CSP that silently widens to '*' when a variable is missing is worse than no
# CSP, because it still looks configured.
CSP_API_URL="${API_URL:-'self'}"
CSP_MEDIA_ORIGIN="${MEDIA_ORIGIN:-'self'}"

sed \
    -e "s|__API_URL__|${CSP_API_URL}|g" \
    -e "s|__MEDIA_ORIGIN__|${CSP_MEDIA_ORIGIN}|g" \
    "$TEMPLATE" > "$OUTPUT"

echo "velora: security headers rendered -> $OUTPUT (connect-src ${CSP_API_URL})"
