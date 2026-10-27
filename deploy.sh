#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/opt/sovia-web"
SERVICE_NAME="sovia-web"
CONTAINER_NAME="sovia-web"
IMAGE_NAME="ghcr.io/comradesovia/sovia-web:prod"
MIGRATION_IMAGE_NAME="ghcr.io/comradesovia/sovia-web:prod-migrate"
MIGRATION_OVERRIDE=""
ROLLBACK_IMAGE_NAME="ghcr.io/comradesovia/sovia-web:rollback"
HEALTH_URL="http://127.0.0.1:4091/"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"

trap 'echo "Deployment failed on line ${LINENO}."' ERR
trap 'if [ -n "$MIGRATION_OVERRIDE" ]; then rm -f -- "$MIGRATION_OVERRIDE"; fi' EXIT

cd "$APP_DIR"

COMPOSE_FILES=()
for compose_file in compose.yml compose.yaml docker-compose.yml docker-compose.yaml; do
  if [ -f "$compose_file" ]; then
    COMPOSE_FILES=(-f "$compose_file")
    break
  fi
done

if [ "${#COMPOSE_FILES[@]}" -eq 0 ]; then
  echo "No Docker Compose file found in $APP_DIR."
  exit 1
fi

if [ -f compose.logging.yml ]; then
  COMPOSE_FILES+=(-f compose.logging.yml)
fi

compose() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

echo "Saving the current running image as rollback, if present..."
CURRENT_IMAGE="$(
  docker inspect \
    --format '{{.Image}}' \
    "$CONTAINER_NAME" 2>/dev/null || true
)"

if [ -n "$CURRENT_IMAGE" ]; then
  docker image tag "$CURRENT_IMAGE" "$ROLLBACK_IMAGE_NAME"
  echo "Rollback image tag updated: $ROLLBACK_IMAGE_NAME -> $CURRENT_IMAGE"
else
  echo "No existing $CONTAINER_NAME container found; skipping rollback tag."
fi

echo "Pulling $IMAGE_NAME..."
compose pull "$SERVICE_NAME"

echo "Pulling migration image..."
docker pull "$MIGRATION_IMAGE_NAME"
MIGRATION_OVERRIDE="$(mktemp "$APP_DIR/.migration-compose.XXXXXX.yml")"
printf 'services:\n  %s:\n    image: %s\n' "$SERVICE_NAME" "$MIGRATION_IMAGE_NAME" > "$MIGRATION_OVERRIDE"
echo "Applying checked-in database migrations before replacing the running app..."
docker compose "${COMPOSE_FILES[@]}" -f "$MIGRATION_OVERRIDE" run --rm --no-deps --entrypoint "node /app/node_modules/prisma/build/index.js" "$SERVICE_NAME" migrate deploy
rm -f -- "$MIGRATION_OVERRIDE"
MIGRATION_OVERRIDE=""

echo "Updating $SERVICE_NAME..."
compose up -d --remove-orphans "$SERVICE_NAME"

echo "Waiting for health check: $HEALTH_URL"
SUCCESS=false
for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl --fail --silent --max-time 10 "$HEALTH_URL" >/dev/null; then
    SUCCESS=true
    echo "Health check passed on attempt $attempt."
    break
  fi

  echo "Health check attempt $attempt/$HEALTH_ATTEMPTS failed; retrying in ${HEALTH_SLEEP_SECONDS}s..."
  sleep "$HEALTH_SLEEP_SECONDS"
done

if [ "$SUCCESS" != "true" ]; then
  echo "Health check failed. Recent $SERVICE_NAME logs:"
  compose logs --tail=100 "$SERVICE_NAME"
  exit 1
fi

echo "Verifying authenticated MCP tools with read-only calls..."
docker exec -e MCP_VERIFY_URL=http://127.0.0.1:3000/api/admin/mcp "$CONTAINER_NAME" node scripts/verify-analytics-mcp.mjs

echo "Pruning dangling Docker images..."
docker image prune -f

compose ps
df -h /
