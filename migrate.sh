#!/usr/bin/env bash
# Smart Timing DB migration runner for backend
# Runs backend migrations via admin API endpoints.
# Usage:
#   BACKEND_URL=https://your-backend.example.com \
#   ADMIN_TOKEN={{ADMIN_JWT}} \
#   ./migrate.sh
#
# Flags:
#   -u <url>   Override BACKEND_URL
#   -h         Help

set -euo pipefail

BACKEND_URL_DEFAULT="http://localhost:4000"
BACKEND_URL="${BACKEND_URL:-$BACKEND_URL_DEFAULT}"

while getopts ":u:h" opt; do
  case $opt in
    u) BACKEND_URL="$OPTARG" ;;
    h)
      echo "Usage: BACKEND_URL=<url> ADMIN_TOKEN={{ADMIN_JWT}} ./migrate.sh [-u <url>]"
      exit 0
      ;;
    \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl not found" >&2
  exit 1
fi

AUTH_HEADER=()
if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  AUTH_HEADER=( -H "Authorization: Bearer $ADMIN_TOKEN" )
fi

function try_post() {
  local path="$1"
  local url="${BACKEND_URL%/}$path"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" -H 'Content-Type: application/json' "${AUTH_HEADER[@]}" || true)
  echo "$status"
}

function get_health() {
  local url="${BACKEND_URL%/}/api/health"
  curl -sS "$url" || true
}

echo "==> Backend: $BACKEND_URL"

# Sanity check
echo "==> Checking health..."
get_health >/dev/null || true

# Try known migration endpoints in order
endpoints=(
  "/api/admin/migrate"
  "/api/admin/init"
  "/api/init"
)

for ep in "${endpoints[@]}"; do
  echo "==> Trying POST $ep"
  code=$(try_post "$ep")
  if [[ "$code" == "200" || "$code" == "201" || "$code" == "204" ]]; then
    echo "✔ Migration triggered via $ep (HTTP $code)"
    exit 0
  elif [[ "$code" == "401" || "$code" == "403" ]]; then
    echo "✖ Unauthorized for $ep (HTTP $code). Provide ADMIN_TOKEN."
  else
    echo "… $ep returned HTTP $code"
  fi
done

echo "✖ No migration endpoint succeeded."
echo "Tips: Ensure backend exposes POST /api/admin/migrate (JWT auth) or /api/init."
exit 1
