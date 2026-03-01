#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/backend/app/ml/datasets"

mkdir -p "$DATA_DIR"

MCC_URL="https://raw.githubusercontent.com/greggles/mcc-codes/master/mcc_codes.csv"
CPI_URL="https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL"

curl -sS "$MCC_URL" -o "$DATA_DIR/mcc_codes.csv"
curl -sS "$CPI_URL" -o "$DATA_DIR/us_cpi.csv"

echo "Imported datasets into $DATA_DIR"
wc -l "$DATA_DIR/mcc_codes.csv" "$DATA_DIR/us_cpi.csv"
