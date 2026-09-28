#!/bin/bash
# Rolls back to the previously deployed image tag. Run on the EC2 instance.
#
#   ./rollback.sh
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .image-tag.previous ]; then
  echo "No previous tag recorded (.image-tag.previous missing). Nothing to roll back to." >&2
  exit 1
fi

PREVIOUS_TAG="$(cat .image-tag.previous)"
echo "[rollback] rolling back to $PREVIOUS_TAG…"

IMAGE_TAG="$PREVIOUS_TAG" docker compose -f docker-compose.prod.yml up -d
echo "$PREVIOUS_TAG" > .image-tag

echo "[rollback] done."
docker compose -f docker-compose.prod.yml logs --tail=40 app
