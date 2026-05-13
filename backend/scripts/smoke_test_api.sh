#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:8000}"
API_KEY="${API_KEY:-local-dev-key}"
TMP_DIR="$(mktemp -d)"
IMAGE_PATH="$TMP_DIR/tiny.png"
CREATE_JSON="$TMP_DIR/create.json"
LIST_JSON="$TMP_DIR/list.json"
META_JSON="$TMP_DIR/meta.json"
PATCH_JSON="$TMP_DIR/patch.json"
DOWNLOADED_IMAGE="$TMP_DIR/downloaded.png"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8j3sAAAAASUVORK5CYII=' | base64 --decode > "$IMAGE_PATH"

curl --fail --silent "$API_BASE_URL/healthz" | tee "$TMP_DIR/health.json"
curl --fail --silent "$API_BASE_URL/readyz" -H "X-API-Key: $API_KEY" | tee "$TMP_DIR/ready.json"

curl --fail --silent \
  -X POST "$API_BASE_URL/images" \
  -H "X-API-Key: $API_KEY" \
  -F "title=compose smoke test" \
  -F "description=verifies docker-compose backend" \
  -F "tags=compose" \
  -F "tags=smoke" \
  -F "file=@$IMAGE_PATH;type=image/png" \
  > "$CREATE_JSON"

IMAGE_ID="$(
  ./venv/bin/python -c "import json,sys; print(json.load(open(sys.argv[1]))['id'])" "$CREATE_JSON"
)"

curl --fail --silent "$API_BASE_URL/images" -H "X-API-Key: $API_KEY" > "$LIST_JSON"
curl --fail --silent "$API_BASE_URL/images/$IMAGE_ID" -H "X-API-Key: $API_KEY" > "$META_JSON"
curl --fail --silent "$API_BASE_URL/images/$IMAGE_ID/content" -H "X-API-Key: $API_KEY" > "$DOWNLOADED_IMAGE"

cmp "$IMAGE_PATH" "$DOWNLOADED_IMAGE"

curl --fail --silent \
  -X PATCH "$API_BASE_URL/images/$IMAGE_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"updated by smoke test","tags":["compose","updated"]}' \
  > "$PATCH_JSON"

curl --fail --silent -X DELETE "$API_BASE_URL/images/$IMAGE_ID" -H "X-API-Key: $API_KEY" > /dev/null

echo "Smoke test passed for image $IMAGE_ID"
