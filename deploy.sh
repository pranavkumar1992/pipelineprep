#!/bin/bash
# Runs on the EC2 instance. Pulls the image tag GitHub Actions just built and
# pushed, then restarts the stack against it. The instance never builds an
# image itself — see .github/workflows/deploy.yml.
#
# Usage:
#   IMAGE_TAG=123456789012.dkr.ecr.ap-south-1.amazonaws.com/pipelineprep:<sha> ./deploy.sh
#
# Requires on the instance:
#   - AWS CLI v2, with a role/instance profile that can ecr:GetAuthorizationToken
#     and ecr:BatchGetImage on the pipelineprep repository (see docs/AWS-DEPLOY.md)
#   - .env.production present, chmod 600
set -euo pipefail

cd "$(dirname "$0")"

if [ -z "${IMAGE_TAG:-}" ]; then
  echo "IMAGE_TAG is required, e.g. <account>.dkr.ecr.<region>.amazonaws.com/pipelineprep:latest" >&2
  exit 1
fi

if [ ! -f .env.production ]; then
  echo ".env.production is missing. See docs/AWS-DEPLOY.md step 5." >&2
  exit 1
fi

ECR_REGISTRY="$(echo "$IMAGE_TAG" | cut -d/ -f1)"
AWS_REGION="$(echo "$ECR_REGISTRY" | sed -E 's/.*\.dkr\.ecr\.([a-z0-9-]+)\.amazonaws\.com/\1/')"

echo "[deploy] logging in to $ECR_REGISTRY ($AWS_REGION)…"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "[deploy] pulling $IMAGE_TAG…"
docker pull "$IMAGE_TAG"

echo "[deploy] recording current tag for rollback…"
if [ -f .image-tag ]; then
  cp .image-tag .image-tag.previous
fi
echo "$IMAGE_TAG" > .image-tag

echo "[deploy] starting stack…"
IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml up -d

echo "[deploy] pruning old images…"
docker image prune -af --filter "until=48h" || true

echo "[deploy] done. Tailing app logs for 10s to catch obvious failures…"
timeout 10 docker compose -f docker-compose.prod.yml logs --tail=40 app || true
