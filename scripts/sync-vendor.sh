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

# --- WASM (pir-sdk-wasm/pkg) -----------------------------------------------
WASM_SRC="$REPO/pir-sdk-wasm/pkg"
WASM_DST="$PLAYGROUND/vendor/pir-sdk-wasm"
if [ ! -d "$WASM_SRC" ]; then
  echo "error: $WASM_SRC not found. Build it first:" >&2
  echo "  cd $REPO/pir-sdk-wasm && wasm-pack build --target web --out-dir pkg" >&2
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
for f in \
  onionpir_client.ts onion-unpack.ts \
  dpf-adapter.ts harmonypir-adapter.ts \
  sdk-bridge.ts sync-controller.ts sync.ts sync-merge.ts \
  codec.ts hash.ts merkle.ts pbc.ts scan.ts ws.ts \
  server-info.ts protocol.ts leakage.ts attest-pin.ts \
  types.ts harmony-types.ts harmonypir_hint_db.ts dpf.ts \
  constants.ts polyfills.ts; do
  if [ -f "$WEB_SRC/$f" ]; then
    cp "$WEB_SRC/$f" "$WEB_DST/$f"
  else
    echo "warn: $WEB_SRC/$f missing — skipping" >&2
  fi
done

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
