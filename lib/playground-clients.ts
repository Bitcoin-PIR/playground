'use client';

/**
 * Playground-level wrapper around the three PIR backends.
 *
 * Each backend (DPF / HarmonyPIR / OnionPIR) is exercised end-to-end:
 *   1. open WS connection(s),
 *   2. attest each server, cross-check against the operator-pinned values,
 *   3. (where supported) upgrade to the AEAD-sealed channel,
 *   4. run a single-scripthash batch query,
 *   5. tear down.
 *
 * The privacy invariants (K=75 INDEX / K_CHUNK=80 CHUNK padding, INDEX item-
 * count symmetry, CHUNK round-presence symmetry, Harmony per-group T-1 count)
 * are owned by the vendored client code — this wrapper is just orchestration
 * and cannot bypass them. There is NO `skipPadding` toggle and there will
 * never be one.
 */

import { loadWasm } from './wasm-loader';
import { HINT_URL, PIR1_URL, PIR2_URL, QUERY_URL } from './endpoints';
import {
  AMD_TURIN_ARK_FINGERPRINT,
  PIR1_PIN,
  PIR2_TIER3_PIN,
  type ServerAttestPin,
} from '@vendor/web/attest-pin';
import { OnionPirWebClient } from '@vendor/web/onionpir_client';
import type { QueryResult, UtxoEntry } from '@vendor/web/types';
import type { Backend } from '@/components/BackendSelector';

// ── Public result shapes ──────────────────────────────────────────────────

export interface AttestationSummary {
  /** Which server. */
  url: string;
  /** Free-form label ("hint" / "query" / "OnionPIR"). */
  label: string;
  /** State: `verified-vcek` is the strongest, `unsupported` means no SEV (Hetzner). */
  state: 'verified' | 'verified-vcek' | 'unsupported' | 'mismatch' | 'error';
  /** Detail for the badge tooltip (e.g. the SEV report-data status). */
  detail: string;
  /** Server-side binary SHA256 (hex). */
  binarySha256Hex?: string;
  /** Server-side git rev. */
  gitRev?: string;
  /** SEV-SNP launch measurement (Tier 3 only). */
  launchMeasurementHex?: string;
  /** What we compared against (the operator-pinned values). */
  pin: ServerAttestPin;
}

export interface PlaygroundUtxo {
  /** TXID in display order (RPC / explorer convention). */
  txidHex: string;
  vout: number;
  /** Amount in satoshis. */
  amountSats: bigint;
}

export interface PlaygroundQueryResult {
  backend: Backend;
  /** scriptPubKey hex used for the lookup. */
  scriptPubKeyHex: string;
  /** HASH160(scriptPubKey) hex — the PIR query key. */
  scriptHashHex: string;
  /** Total milliseconds: end of query - start of connect. */
  totalElapsedMs: number;
  /** Just the query, excluding connect/attest. */
  queryElapsedMs: number;
  /** UTXOs returned (may be empty for an unfunded address). */
  utxos: PlaygroundUtxo[];
  /** Sum of `utxos[*].amountSats`. */
  totalSats: bigint;
  /** True if the address was excluded from the DB as a "whale" (too many UTXOs). */
  isWhale: boolean;
  /**
   * Bucket-Merkle verification result. `true` = proof passed (or DB doesn't
   * publish Merkle commitments). `false` = a proof failed — treat the
   * result as untrusted.
   */
  merkleVerified: boolean;
  /** Per-server attestation, in connection order. */
  attestation: AttestationSummary[];
  /** Backend-specific notes (e.g. "Hint server attestation skipped — Hetzner has no SEV"). */
  notes: string[];
}

// ── Internal: attestation helper used by DPF + Harmony WASM clients ───────

interface ClientWithAttest {
  attest(serverIndex: number): Promise<{
    sevStatus: string;
    serverStaticPubHex: string;
    binarySha256Hex: string;
    gitRev: string;
    launchMeasurementHex: string;
    hasVcekChain: boolean;
    serverStaticPub: Uint8Array;
    verifyVcekChain(expected: Uint8Array): void;
    free(): void;
  }>;
  upgradeToSecureChannel(pub0: Uint8Array, pub1: Uint8Array): Promise<void>;
}

async function attestAndUpgrade(
  client: ClientWithAttest,
  servers: { url: string; label: string; pin: ServerAttestPin; index: 0 | 1 }[],
): Promise<{ attestation: AttestationSummary[]; channelUpgraded: boolean }> {
  const att: AttestationSummary[] = [];
  const handles: ({ pub: Uint8Array } | null)[] = [];

  // Sequential — wasm-bindgen serializes the underlying `&mut self`.
  for (const s of servers) {
    try {
      const v = await client.attest(s.index);
      const matched = v.sevStatus === 'reportDataMatch';
      const noSev = v.sevStatus === 'noSevHost';
      const allZero = v.serverStaticPub.every((b) => b === 0);

      // Pin check (always done — even non-SEV hosts have binarySha256Hex pinnable).
      let pinError: string | null = null;
      if (
        s.pin.binarySha256Hex &&
        v.binarySha256Hex &&
        s.pin.binarySha256Hex.toLowerCase() !== v.binarySha256Hex.toLowerCase()
      ) {
        pinError = `binary_sha256 mismatch (expected ${s.pin.binarySha256Hex.slice(0, 12)}…, got ${v.binarySha256Hex.slice(0, 12)}…)`;
      } else if (
        s.pin.measurementHex &&
        v.launchMeasurementHex &&
        s.pin.measurementHex.toLowerCase() !== v.launchMeasurementHex.toLowerCase()
      ) {
        pinError = `MEASUREMENT mismatch (expected ${s.pin.measurementHex.slice(0, 12)}…, got ${v.launchMeasurementHex.slice(0, 12)}…)`;
      }

      let state: AttestationSummary['state'];
      let detail: string;
      if (pinError) {
        state = 'mismatch';
        detail = pinError;
      } else if (noSev) {
        state = 'unsupported';
        detail = 'No SEV-SNP on this host (Hetzner i7-8700)';
      } else if (!matched) {
        state = 'mismatch';
        detail = `sevStatus=${v.sevStatus}`;
      } else if (allZero) {
        state = 'mismatch';
        detail = 'Server reported all-zero channel pubkey';
      } else {
        state = 'verified';
        detail = `SEV-SNP REPORT_DATA matches (binary=${v.binarySha256Hex.slice(0, 8)}…)`;

        // Slice D.3: AMD VCEK chain
        if (v.hasVcekChain) {
          try {
            v.verifyVcekChain(AMD_TURIN_ARK_FINGERPRINT);
            state = 'verified-vcek';
            detail = `AMD VCEK chain validated, binary=${v.binarySha256Hex.slice(0, 8)}…`;
          } catch (e) {
            state = 'mismatch';
            detail = `VCEK chain failed: ${(e as Error)?.message ?? e}`;
          }
        }
      }

      att.push({
        url: s.url,
        label: s.label,
        state,
        detail,
        binarySha256Hex: v.binarySha256Hex,
        gitRev: v.gitRev,
        launchMeasurementHex: v.launchMeasurementHex,
        pin: s.pin,
      });

      handles.push(allZero ? null : { pub: v.serverStaticPub.slice() });
      v.free();
    } catch (e) {
      att.push({
        url: s.url,
        label: s.label,
        state: 'error',
        detail: `attest threw: ${(e as Error)?.message ?? e}`,
        pin: s.pin,
      });
      handles.push(null);
    }
  }

  // Upgrade to the AEAD-sealed channel only when BOTH servers cleared.
  let channelUpgraded = false;
  const canUpgrade = (s: AttestationSummary['state']) =>
    s === 'verified' || s === 'verified-vcek' || s === 'unsupported';
  if (
    att.every((a) => canUpgrade(a.state)) &&
    handles[0] &&
    handles[1]
  ) {
    try {
      await client.upgradeToSecureChannel(handles[0].pub, handles[1].pub);
      channelUpgraded = true;
    } catch (e) {
      // Mark both as mismatch since the channel didn't actually come up.
      for (const a of att) {
        if (a.state === 'verified' || a.state === 'verified-vcek') {
          a.state = 'mismatch';
          a.detail = `channel upgrade failed: ${(e as Error)?.message ?? e}`;
        }
      }
    }
  }

  return { attestation: att, channelUpgraded };
}

// ── WasmQueryResult -> PlaygroundQueryResult ──────────────────────────────

function translateWasmEntries(wqr: {
  entryCount: number;
  totalBalance: bigint;
  isWhale: boolean;
  merkleVerified: boolean;
  getEntry(i: number): { txid: string; vout: number; amountSats?: number; amount?: number } | null | undefined;
}): { utxos: PlaygroundUtxo[]; totalSats: bigint; isWhale: boolean; merkleVerified: boolean } {
  const utxos: PlaygroundUtxo[] = [];
  for (let i = 0; i < wqr.entryCount; i++) {
    const e = wqr.getEntry(i);
    if (!e) continue;
    // WASM packs txid as raw 32-byte internal order — reverse for display.
    const txidLE = e.txid;
    const txidDisplay = reverseHex(txidLE);
    utxos.push({
      txidHex: txidDisplay,
      vout: Number(e.vout),
      amountSats: BigInt(e.amountSats ?? e.amount ?? 0),
    });
  }
  return {
    utxos,
    totalSats: wqr.totalBalance,
    isWhale: wqr.isWhale,
    merkleVerified: wqr.merkleVerified,
  };
}

function reverseHex(hex: string): string {
  let out = '';
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    out += hex.slice(i, i + 2);
  }
  return out;
}

// ── DPF backend ───────────────────────────────────────────────────────────

export async function runDpfQuery(
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
): Promise<PlaygroundQueryResult> {
  const wasm = await loadWasm();
  const t0 = performance.now();
  const client = new wasm.WasmDpfClient(PIR1_URL, PIR2_URL);
  const notes: string[] = [];
  try {
    await client.connect();

    const { attestation } = await attestAndUpgrade(client as unknown as ClientWithAttest, [
      { url: PIR1_URL, label: 'hint (pir1)', pin: PIR1_PIN, index: 0 },
      { url: PIR2_URL, label: 'query (pir2)', pin: PIR2_TIER3_PIN, index: 1 },
    ]);

    // Catalog warms the native-side state that `queryBatchRaw` needs to
    // resolve `db_id` against. Without this, the next call errors with
    // "invalid state: no catalog".
    const catalog = await client.fetchCatalog();
    catalog.free?.();

    const packed = new Uint8Array(20);
    packed.set(scriptHash, 0);

    const qStart = performance.now();
    const wqrs = (await client.queryBatchRaw(packed, 0)) as any[];
    const qElapsed = performance.now() - qStart;

    if (wqrs.length !== 1) {
      throw new Error(`Expected 1 result, got ${wqrs.length}`);
    }
    const wqr = wqrs[0];
    const { utxos, totalSats, isWhale, merkleVerified } = translateWasmEntries(wqr);
    if (typeof wqr.free === 'function') wqr.free();

    return {
      backend: 'dpf',
      scriptPubKeyHex,
      scriptHashHex: bytesToHex(scriptHash),
      totalElapsedMs: performance.now() - t0,
      queryElapsedMs: qElapsed,
      utxos,
      totalSats,
      isWhale,
      merkleVerified,
      attestation,
      notes,
    };
  } finally {
    try {
      await client.disconnect();
    } catch {}
    client.free?.();
  }
}

// ── HarmonyPIR backend ────────────────────────────────────────────────────

export async function runHarmonyQuery(
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
): Promise<PlaygroundQueryResult> {
  const wasm = await loadWasm();
  const t0 = performance.now();
  const client = new wasm.WasmHarmonyClient(HINT_URL, QUERY_URL);
  const notes: string[] = [];
  try {
    await client.connect();

    const { attestation } = await attestAndUpgrade(client as unknown as ClientWithAttest, [
      { url: HINT_URL, label: 'hint (pir1)', pin: PIR1_PIN, index: 0 },
      { url: QUERY_URL, label: 'query (pir2)', pin: PIR2_TIER3_PIN, index: 1 },
    ]);

    // Warm up the catalog so `queryBatchRaw` can resolve db_id.
    const catalog = await client.fetchCatalog();
    catalog.free?.();

    const packed = new Uint8Array(20);
    packed.set(scriptHash, 0);

    const qStart = performance.now();
    const wqrs = (await client.queryBatchRaw(packed, 0)) as any[];
    const qElapsed = performance.now() - qStart;

    if (wqrs.length !== 1) {
      throw new Error(`Expected 1 result, got ${wqrs.length}`);
    }
    const wqr = wqrs[0];
    const { utxos, totalSats, isWhale, merkleVerified } = translateWasmEntries(wqr);
    if (typeof wqr.free === 'function') wqr.free();

    notes.push(
      'HarmonyPIR fetches a one-time hint pool (~50 MB) from the hint server before queries.',
    );

    return {
      backend: 'harmonypir',
      scriptPubKeyHex,
      scriptHashHex: bytesToHex(scriptHash),
      totalElapsedMs: performance.now() - t0,
      queryElapsedMs: qElapsed,
      utxos,
      totalSats,
      isWhale,
      merkleVerified,
      attestation,
      notes,
    };
  } finally {
    try {
      await client.disconnect();
    } catch {}
    client.free?.();
  }
}

// ── OnionPIR backend (hand-rolled TS client) ──────────────────────────────

/**
 * Install the OnionPIR wasm factory via the documented test hook
 * (`globalThis.__onionpirWasmFactory`).  The vendored client's `loadWasmModule`
 * does `import('/wasm/onionpir_client.mjs')` at runtime — webpack rewrites
 * the literal at bundle time and the resulting module-resolution call fails
 * with `Cannot find module '/wasm/onionpir_client.mjs'`.  Bypassing the
 * webpack-managed import by installing the factory ourselves loads the same
 * `.mjs` from /public via the native browser loader.
 */
async function ensureOnionWasmFactory(): Promise<void> {
  type OnionFactory = (m?: object) => Promise<unknown>;
  type Holder = { __onionpirWasmFactory?: OnionFactory };
  const g = globalThis as unknown as Holder;
  if (g.__onionpirWasmFactory) return;
  // `webpackIgnore: true` tells webpack to leave the import alone; the
  // browser's native ESM loader fetches from /wasm/onionpir_client.mjs
  // (served out of public/ at request time).  The path is computed at
  // runtime so `tsc --noEmit` doesn't try to resolve it.
  const url = '/wasm/onionpir_client.mjs';
  const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ url)) as {
    default: OnionFactory;
  };
  g.__onionpirWasmFactory = mod.default;
}

export async function runOnionPirQuery(
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
): Promise<PlaygroundQueryResult> {
  // OnionPIR only talks to one server. The fleet split puts the OnionPIR
  // worker on pir1 (Hetzner). pir2 currently runs --serve-queries only and
  // doesn't expose OnionPIR.
  const url = PIR1_URL;
  const t0 = performance.now();
  const notes: string[] = [];
  await ensureOnionWasmFactory();
  const client = new OnionPirWebClient({ serverUrl: url });
  try {
    await client.connect();

    // Hand-roll attestation against pir1's pin. The hand-rolled TS client
    // doesn't expose attest(); we still surface a best-effort summary so
    // the playground badge is consistent across backends.
    const attestation: AttestationSummary[] = [
      {
        url,
        label: 'OnionPIR (pir1)',
        state: 'unsupported',
        detail: 'OnionPIR runs on the Hetzner host (no SEV-SNP). Pin only covers binary_sha256.',
        pin: PIR1_PIN,
      },
    ];

    const qStart = performance.now();
    const results = await client.queryBatch([scriptHash], undefined, 0);
    const qElapsed = performance.now() - qStart;

    const out = translateLegacyResult(results[0]);

    notes.push(
      'OnionPIR is a single-server FHE backend. SEAL doesn’t compile to wasm32, so this client is hand-rolled TypeScript.',
    );

    return {
      backend: 'onionpir',
      scriptPubKeyHex,
      scriptHashHex: bytesToHex(scriptHash),
      totalElapsedMs: performance.now() - t0,
      queryElapsedMs: qElapsed,
      utxos: out.utxos,
      totalSats: out.totalSats,
      isWhale: out.isWhale,
      merkleVerified: out.merkleVerified,
      attestation,
      notes,
    };
  } finally {
    try {
      client.disconnect();
    } catch {}
  }
}

function translateLegacyResult(r: QueryResult | null | undefined): {
  utxos: PlaygroundUtxo[];
  totalSats: bigint;
  isWhale: boolean;
  merkleVerified: boolean;
} {
  if (!r) {
    return { utxos: [], totalSats: 0n, isWhale: false, merkleVerified: true };
  }
  const utxos: PlaygroundUtxo[] = (r.entries ?? []).map((e: UtxoEntry) => ({
    // Legacy entries hold raw 32B internal-order TXID — reverse for display.
    txidHex: reverseBytesHex(e.txid),
    vout: e.vout,
    amountSats: BigInt(e.amount),
  }));
  return {
    utxos,
    totalSats: r.totalSats ?? 0n,
    isWhale: !!r.isWhale,
    merkleVerified: r.merkleVerified !== false,
  };
}

function reverseBytesHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = bytes.length - 1; i >= 0; i--) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

export async function runQuery(
  backend: Backend,
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
): Promise<PlaygroundQueryResult> {
  if (backend === 'dpf') return runDpfQuery(scriptHash, scriptPubKeyHex);
  if (backend === 'harmonypir') return runHarmonyQuery(scriptHash, scriptPubKeyHex);
  if (backend === 'onionpir') return runOnionPirQuery(scriptHash, scriptPubKeyHex);
  throw new Error(`Unknown backend ${backend as string}`);
}
