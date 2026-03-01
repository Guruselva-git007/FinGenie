#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_DB="${MYSQL_DB:-fingenie}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if [ -z "${MYSQL_PASSWORD:-}" ]; then
  echo "MYSQL_PASSWORD is required. Example:"
  echo "MYSQL_PASSWORD='your-pass' ./scripts/run_local.sh"
  exit 1
fi

"$ROOT_DIR/scripts/setup_mysql.sh"
"$ROOT_DIR/scripts/import_datasets.sh"

ENCODED_PASSWORD=$(python3 -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["MYSQL_PASSWORD"], safe=""))')

cat > "$BACKEND_DIR/.env" <<ENVEOF
DATABASE_URL=mysql+pymysql://${MYSQL_USER}:${ENCODED_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}?charset=utf8mb4
CORS_ORIGINS=["http://localhost:${FRONTEND_PORT}","http://127.0.0.1:${FRONTEND_PORT}"]
ENVEOF

if [ ! -d "$BACKEND_DIR/.venv" ]; then
  python3 -m venv --system-site-packages "$BACKEND_DIR/.venv"
fi

(
  cd "$BACKEND_DIR"
  . .venv/bin/activate
  pip install -r requirements.txt >/dev/null
  uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

(
  cd "$FRONTEND_DIR"
  npm install >/dev/null
  npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "FinGenie running"
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"

echo "Press Ctrl+C to stop"
wait
