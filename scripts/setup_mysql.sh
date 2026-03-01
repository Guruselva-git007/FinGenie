#!/usr/bin/env bash
set -euo pipefail

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_DB="${MYSQL_DB:-fingenie}"

if [ -z "${MYSQL_PASSWORD:-}" ]; then
  echo "MYSQL_PASSWORD is required for MySQL setup." >&2
  exit 1
fi

MYSQL_PWD="$MYSQL_PASSWORD" mysql \
  --protocol=TCP \
  -h"$MYSQL_HOST" \
  -P"$MYSQL_PORT" \
  -u"$MYSQL_USER" \
  -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "MySQL database '$MYSQL_DB' is ready on $MYSQL_HOST:$MYSQL_PORT"
