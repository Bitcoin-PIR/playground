#!/usr/bin/env bash
# Sync vendored WASM + TS sources from the main Bitcoin PIR repo.
#
# Usage:
#   BITCOINPIR_REPO=/path/to/BitcoinPIR ./scripts/sync-vendor.sh
#
# Defaults to ~/BitcoinPIR if BITCOINPIR_REPO is unset.
set -euo pipefail

REPO=${BITCOINPIR_REPO:-$HOME/BitcoinPIR}
if [ ! -d "$REPO" ]; then
  echo "error: BitcoinPIR repo not found at $REPO (set BITCOINPIR_REPO)" >&2
  exit 1
fi

PLAYGROUND=$(cd "$(dirname "$0")/.." && pwd)
echo "syncing from $REPO -> $PLAYGROUND/vendor/"

# --- WASM (crates/sdk/wasm/pkg) --------------------------------------------
WASM_SRC="$REPO/crates/sdk/wasm/pkg"
WASM_DST="$PLAYGROUND/vendor/pir-sdk-wasm"
if [ ! -d "$WASM_SRC" ]; then
  echo "error: $WASM_SRC not found. Build it first:" >&2
  echo "  cd $REPO/crates/sdk/wasm && wasm-pack build --target web --out-dir pkg" >&2
  exit 1
fi
rm -rf "$WASM_DST"
mkdir -p "$WASM_DST"
cp "$WASM_SRC"/pir_sdk_wasm.js "$WASM_DST/"
cp "$WASM_SRC"/pir_sdk_wasm.d.ts "$WASM_DST/"
cp "$WASM_SRC"/pir_sdk_wasm_bg.wasm "$WASM_DST/"
cp "$WASM_SRC"/pir_sdk_wasm_bg.wasm.d.ts "$WASM_DST/" 2>/dev/null || true
cp "$WASM_SRC"/package.json "$WASM_DST/package.json.upstream"
cp "$WASM_SRC"/LICENSE-* "$WASM_DST/" 2>/dev/null || true

# --- OnionPIR TS client + transitive TS deps ------------------------------
WEB_SRC="$REPO/web/src"
WEB_DST="$PLAYGROUND/vendor/bitcoinpir-web"
if [ ! -d "$WEB_SRC" ]; then
  echo "error: $WEB_SRC not found" >&2
  exit 1
fi
rm -rf "$WEB_DST"
mkdir -p "$WEB_DST"
# Files needed for OnionPIR + DPF/Harmony adapters + shared utilities.
# Derived from the import graph; see CONTRIBUTING.md for the full set.
# Every non-test module of the browser client library. Copying the whole
# directory (instead of a hand-kept list) keeps the vendor in step as the
# library grows (credits, ORAM, proof verification, ...).
find "$WEB_SRC" -maxdepth 1 -type f -name '*.ts' ! -name '*.test.ts' -exec cp {} "$WEB_DST/" \;

# --- Record the source commit ---------------------------------------------
if (cd "$REPO" && git rev-parse HEAD > /dev/null 2>&1); then
  SHA=$(cd "$REPO" && git rev-parse HEAD)
  DIRTY=""
  if ! (cd "$REPO" && git diff-index --quiet HEAD); then
    DIRTY=" (dirty)"
  fi
  echo "BitcoinPIR @ $SHA$DIRTY" > "$PLAYGROUND/vendor/SOURCE_COMMIT.txt"
  echo "synced from BitcoinPIR @ $SHA$DIRTY"
else
  echo "not-a-git-repo $(date -u +%FT%TZ)" > "$PLAYGROUND/vendor/SOURCE_COMMIT.txt"
fi
echo "done. Commit vendor/ + vendor/SOURCE_COMMIT.txt."
