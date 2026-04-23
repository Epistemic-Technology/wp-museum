#!/bin/bash
set -e

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/cert.crt" ] && [ -f "$CERT_DIR/cert.key" ]; then
  echo "Certs already exist at $CERT_DIR"
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 \
  -days 3650 \
  -keyout "$CERT_DIR/cert.key" \
  -out "$CERT_DIR/cert.crt" \
  -subj "/CN=wp-museum.local"

echo "Self-signed certs written to $CERT_DIR"
