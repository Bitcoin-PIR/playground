/**
 * Query runner for the explorer page.
 *
 * Drives one query against the live PIR1/PIR2 servers using the vendored
 * WASM client (DPF or HarmonyPIR). The FrameTap is attached BEFORE the
 * WS connection opens so every frame is captured. The runner returns the
 * captured frame list plus a single-line outcome ("found N UTXOs",
 * "not found", or "error: <msg>").
 *
 * OnionPIR is intentionally not driven here: the OnionPIR WASM artifact
 * (`/wasm/onionpir_client.mjs` + `.wasm`) is not yet vendored into the
 * playground repo. The UI surfaces OnionPIR but tells the user it
 * requires the additional artifact. See the README / docs for the
 * sync-vendor follow-up.
 */

'use client';

import { loadWasm } from '@/lib/wasm-loader';
import { PIR1_URL, PIR2_URL, HINT_URL, QUERY_URL } from '@/lib/endpoints';
import { FrameTap, type CapturedFrame } from './frame-tap';
import { hexToBytes, scriptHash, addressToScriptPubKey } from '@vendor/web/hash';

// ─── Backend tag ─────────────────────────────────────────────────────────────

export type Backend = 'dpf' | 'harmonypir' | 'onionpir';

// ─── Result ──────────────────────────────────────────────────────────────────

export interface QueryRun {
  /** Captured frames (snapshot at end of run). */
  frames: CapturedFrame[];
  /** Human-readable outcome line for the UI. */
  outcome: string;
  /** True if the query reported "found" — useful for found-vs-not-found diff. */
  found: boolean;
  /** Set when the runner caught an error. Frames are still returned. */
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a Bitcoin address OR a raw scriptPubKey hex into a 20-byte
 * HASH160 scripthash, matching what the PIR clients expect.
 *
 * Rules:
 *   - Address (P2PKH / P2SH / Bech32) → encode to scriptPubKey, then HASH160
 *   - 40-char hex (already a 20-byte HASH160) → use verbatim
 *   - Any other hex string → treat as a scriptPubKey hex, take HASH160
 */
export function deriveScriptHash(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Empty address / SPK');

  // Try address first.
  const spk = addressToScriptPubKey(trimmed);
  if (spk) {
    return scriptHash(hexToBytes(spk));
  }

  // Plain hex?
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    if (trimmed.length === 40) {
      // Already a 20-byte scripthash hex.
      return hexToBytes(trimmed);
    }
    // Otherwise interpret as a scriptPubKey hex.
    return scriptHash(hexToBytes(trimmed));
  }

  throw new Error('Not a recognised Bitcoin address or hex');
}

// ─── Packed scripthash for the WASM API ─────────────────────────────────────

function packOne(sh: Uint8Array): Uint8Array {
  if (sh.length !== 20) throw new Error(`scripthash must be 20 bytes, got ${sh.length}`);
  return sh;
}

// ─── DPF runner ──────────────────────────────────────────────────────────────

async function runDpf(tap: FrameTap, sh: Uint8Array): Promise<QueryRun> {
  const wasm = await loadWasm();
  const client = new wasm.WasmDpfClient(PIR1_URL, PIR2_URL);
  try {
    // useSecureChannel is enabled by default — the DPF adapter normally
    // calls `upgradeToSecureChannel` after attest. We deliberately skip
    // it here: with the encrypted-channel wrapper the wire is ChaCha20
    // ciphertext (opaque to our wire inspection). To make the invariants
    // observable in the explorer, we leave the channel in cleartext.
    await client.connect();
    await client.fetchCatalog();
    const results = await client.queryBatch(packOne(sh), 0);
    const found = Array.isArray(results) && results.length > 0 && results[0] !== null;
    let outcome: string;
    if (found) {
      const r = results[0];
      const n = Array.isArray(r?.entries) ? r.entries.length : 0;
      outcome = `Found — ${n} UTXO entry/entries`;
    } else {
      outcome = 'Not found in the main snapshot';
    }
    return { frames: tap.snapshot(), outcome, found };
  } finally {
    try {
      await client.disconnect();
    } catch {
      /* swallow */
    }
    client.free();
  }
}

// ─── HarmonyPIR runner ───────────────────────────────────────────────────────

async function runHarmony(tap: FrameTap, sh: Uint8Array): Promise<QueryRun> {
  const wasm = await loadWasm();
  const client = new wasm.WasmHarmonyClient(HINT_URL, QUERY_URL);
  try {
    // Same channel rationale as DPF — leave cleartext for observability.
    await client.connect();
    const catalog = await client.fetchCatalog();
    // The HarmonyPIR client needs main-DB hints before issuing queries.
    // `fetchHintsWithProgress` pulls them; total ≈ index_k + chunk_k = 155.
    try {
      await client.fetchHintsWithProgress(catalog, 0, (_p: unknown) => {});
    } catch (e) {
      // If hint fetch fails (e.g. cached hints already loaded), proceed
      // — the next queryBatch will surface a real error if hints are
      // truly missing.
    }
    const results = await client.queryBatch(packOne(sh), 0);
    const found = Array.isArray(results) && results.length > 0 && results[0] !== null;
    let outcome: string;
    if (found) {
      const r = results[0];
      const n = Array.isArray(r?.entries) ? r.entries.length : 0;
      outcome = `Found — ${n} UTXO entry/entries`;
    } else {
      outcome = 'Not found in the main snapshot';
    }
    return { frames: tap.snapshot(), outcome, found };
  } finally {
    try {
      await client.disconnect();
    } catch {
      /* swallow */
    }
    client.free();
  }
}

// ─── OnionPIR runner (stub — see header) ─────────────────────────────────────

async function runOnion(tap: FrameTap, sh: Uint8Array): Promise<QueryRun> {
  // OnionPIR is partially supported: the vendored TS client
  // (vendor/bitcoinpir-web/onionpir_client.ts) lazy-loads
  // `/wasm/onionpir_client.mjs` from the public asset tree. That file is
  // NOT vendored into the playground today — the sync-vendor.sh script
  // only copies the SDK WASM. The DPF and HarmonyPIR frames demonstrate
  // the same K=75 / K_CHUNK=80 / kpg=2 invariants on the wire.
  //
  // We still run a thin handshake against the OnionPIR server: open a
  // WebSocket, send REQ_GET_INFO_JSON, then close. That gives a few
  // captured frames so the user can see the protocol-level traffic
  // (PING/PONG, INFO_JSON) even without the OnionPIR WASM artifact.
  void sh;
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(PIR2_URL);
    ws.binaryType = 'arraybuffer';
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timed out connecting to OnionPIR server'));
    }, 10_000);
    ws.onopen = () => {
      // Send REQ_GET_INFO_JSON (0x03) — length-prefixed.
      const msg = new Uint8Array(5);
      msg[0] = 1;
      msg[1] = 0;
      msg[2] = 0;
      msg[3] = 0;
      msg[4] = 0x03;
      ws.send(msg);
      // Wait a short moment for the response, then close.
      setTimeout(() => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }, 1500);
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      ws.close();
      reject(new Error('OnionPIR WebSocket error'));
    };
  });
  return {
    frames: tap.snapshot(),
    outcome:
      'OnionPIR INFO frame captured. Full FHE query path requires the OnionPIR WASM artifact (not vendored yet — see vendor/README.md).',
    found: false,
  };
}

// ─── Public entry point ──────────────────────────────────────────────────────

export interface RunOptions {
  backend: Backend;
  input: string;
  /**
   * Optional pre-existing tap. When omitted, a fresh FrameTap is created,
   * attached for the duration of the query, then disposed. When supplied,
   * the runner does NOT attach/detach — the caller manages the tap lifecycle.
   */
  tap?: FrameTap;
}

export async function runQuery(opts: RunOptions): Promise<QueryRun> {
  const { backend, input } = opts;
  let tap = opts.tap ?? null;
  const ownTap = tap === null;
  if (!tap) {
    tap = new FrameTap();
    tap.attach();
  }
  try {
    let sh: Uint8Array;
    try {
      sh = deriveScriptHash(input);
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      return {
        frames: tap.snapshot(),
        outcome: `Input error: ${msg}`,
        found: false,
        error: msg,
      };
    }

    try {
      if (backend === 'dpf') return await runDpf(tap, sh);
      if (backend === 'harmonypir') return await runHarmony(tap, sh);
      if (backend === 'onionpir') return await runOnion(tap, sh);
      throw new Error(`Unsupported backend: ${backend}`);
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      return { frames: tap.snapshot(), outcome: `Error: ${msg}`, found: false, error: msg };
    }
  } finally {
    if (ownTap) tap.dispose();
  }
}
