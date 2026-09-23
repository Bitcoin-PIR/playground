'use client';

/**
 * Playground-level wrapper around the four backends.
 *
 * Each backend (DPF / HarmonyPIR / OnionPIR / Direct ORAM) is exercised
 * end-to-end:
 *   1. open WS connection(s),
 *   2. attest each server, cross-check against the operator-pinned values,
 *   3. upgrade to the AEAD-sealed channel and check the operator-signed
 *      identity of each server against its own pinned operator key,
 *   4. enable credits (docs/CREDITS.md in the main repo) with the caller's
 *      credit provider — the playground has no wallet yet, so its provider is
 *      empty and a server that requires credits stops the query with a clear
 *      "payment required" result,
 *   5. run a single-scripthash batch query and verify it,
 *   6. tear down.
 *
 * The privacy invariants (K=75 INDEX / K_CHUNK=80 CHUNK padding, INDEX item-
 * count symmetry, CHUNK round-presence symmetry, Harmony per-group T-1 count,
 * the fixed-budget ORAM request shape) are owned by the vendored client code —
 * this wrapper is just orchestration and cannot bypass them. There is NO
 * `skipPadding` toggle and there will never be one.
 */

import { loadWasm } from './wasm-loader';
import { HINT_URL, PIR1_URL, PIR2_URL, QUERY_URL } from './endpoints';
import {
  AMD_TURIN_ARK_FINGERPRINT,
  PIR1_PIN,
  PIR2_TIER3_PIN,
  PRODUCTION_ORAM_DB_PROOF_V2_PINS,
  type ServerAttestPin,
} from '@vendor/web/attest-pin';
import {
  gateOperatorIdentity,
  type OperatorIdentity,
  type ServerAttestation,
} from '@vendor/web/dpf-adapter';
import type { WasmAnnounceVerification } from '@vendor/web/sdk-bridge';
import { OnionPirWebClient } from '@vendor/web/onionpir_client';
import { OramPirClientAdapter } from '@vendor/web/oram-adapter';
import {
  PIR1_PROVIDER,
  PIR2_PROVIDER,
  PRODUCTION_ORAM_BATCH_PLANNER,
} from '@vendor/web/production-providers';
import type { CreditEnablement, CreditProvider } from '@vendor/web/credits';
import type { QueryResult, UtxoEntry } from '@vendor/web/types';
import type { Backend } from '@/components/BackendSelector';

// ── Public result shapes ──────────────────────────────────────────────────

export interface AttestationSummary {
  /** Which server. */
  url: string;
  /** Free-form label ("hint" / "query" / "OnionPIR" / "ORAM"). */
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

/**
 * Per-server operator-signed-identity (REQ_ANNOUNCE) verdict, paired with
 * the connection-order label. `identity.state === 'verified'` means the
 * server's announce bundle passed the operator-pin + cert-signature +
 * validity + chain + channel-binding checks against that server's pinned
 * operator key (pir1 and pir2 are endorsed by different operator keys).
 * Gate any "verified operator" UI on that state alone.
 */
export interface OperatorIdentitySummary {
  /** Connection-order label, matching `AttestationSummary.label`. */
  label: string;
  identity: OperatorIdentity;
}

/**
 * Credits (paid queries) on one server, for this backend: `required` means
 * its metered frames are paid from the credit provider, `best-effort` that
 * they are free while the server has room (paid only when it is busy and the
 * provider has credits), `not-enabled` / `not-required` that it is free.
 */
export interface CreditsSummary {
  label: string;
  state: CreditEnablement['state'];
  error?: string;
}

/**
 * A server refused the query: it requires credits and the credit provider
 * had none, or its free lane was busy (`free capacity busy: …`). The rest
 * of the result (attestation, identity, credits states) is still real;
 * there are no UTXOs.
 */
export interface PaymentRequired {
  /** Server-side message, verbatim. */
  message: string;
  /** Rate-card estimate for one single-address lookup on this backend. */
  approxCredits: number;
}

/** Credits per single-address lookup, from the rate card (docs/CREDITS.md). */
export const RATE_CARD_CREDITS: Record<Backend, number> = {
  dpf: 2,
  harmonypir: 5,
  onionpir: 10,
  oram: 1,
};

/** 1 credit = 10 sat (issuer `/v2/info` `credit_sat`). */
export const CREDIT_SAT = 10;

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
   * How the result is authenticated. `merkle`: per-bucket Merkle proofs
   * checked against the published roots (DPF / HarmonyPIR / OnionPIR).
   * `attested-oram`: Direct ORAM has no Merkle proofs; the result comes from
   * the attested SEV-SNP runtime whose database proof verified in the browser.
   */
  verification: 'merkle' | 'attested-oram';
  /** `true` when the verification above passed. `false` = untrusted result. */
  merkleVerified: boolean;
  /** Per-server attestation, in connection order. */
  attestation: AttestationSummary[];
  /** Per-server operator-signed-identity verdict, in connection order. */
  operatorIdentity: OperatorIdentitySummary[];
  /** Per-server credits state, in connection order. */
  credits: CreditsSummary[];
  /** Set when a server refused the query: no credits, or its free lane was busy. */
  paymentRequired?: PaymentRequired;
  /** Backend-specific notes (e.g. "Hint server attestation skipped — Hetzner has no SEV"). */
  notes: string[];
}

export interface PlaygroundQueryOptions {
  /**
   * Credits for servers that require them. Omitted = no wallet (the
   * playground today): the provider hands out nothing.
   */
  creditProvider?: CreditProvider;
}

/** The playground's wallet today: empty. */
const NO_CREDITS: CreditProvider = () => null;

const CREDITS_REFUSAL = /credits required|insufficient gas|REQ_CREDIT_PRESENT|free capacity busy/i;

function errorMessage(e: unknown): string {
  return (e as Error)?.message ?? String(e);
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
  announce(serverIndex: number): Promise<WasmAnnounceVerification>;
  enableCredits(serverIndex: number, provider: CreditProvider): Promise<string>;
}

interface ServerLeg {
  url: string;
  label: string;
  pin: ServerAttestPin;
  index: 0 | 1;
  operatorPubkey: Uint8Array;
  stableServerId: string;
}

async function attestAndUpgrade(
  client: ClientWithAttest,
  servers: ServerLeg[],
): Promise<{
  attestation: AttestationSummary[];
  channelUpgraded: boolean;
  operatorIdentity: OperatorIdentitySummary[];
}> {
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
        detail = 'No SEV-SNP on this host (Hetzner i7-8700); binary pin only';
      } else if (!matched) {
        state = 'mismatch';
        detail = `sevStatus=${v.sevStatus}`;
      } else if (allZero) {
        state = 'mismatch';
        detail = 'Server reported all-zero channel pubkey';
      } else {
        state = 'verified';
        detail = `SEV-SNP REPORT_DATA matches (binary=${v.binarySha256Hex.slice(0, 8)}…)`;

        // AMD VCEK chain
        if (v.hasVcekChain) {
          try {
            v.verifyVcekChain(AMD_TURIN_ARK_FINGERPRINT);
            state = 'verified-vcek';
            detail = `AMD VCEK chain validated, binary=${v.binarySha256Hex.slice(0, 8)}…`;
          } catch (e) {
            state = 'mismatch';
            detail = `VCEK chain failed: ${errorMessage(e)}`;
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

      handles.push(allZero || state === 'mismatch' ? null : { pub: v.serverStaticPub.slice() });
      v.free();
    } catch (e) {
      att.push({
        url: s.url,
        label: s.label,
        state: 'error',
        detail: `attest threw: ${errorMessage(e)}`,
        pin: s.pin,
      });
      handles.push(null);
    }
  }

  // Upgrade to the AEAD-sealed channel only when BOTH servers cleared.
  let channelUpgraded = false;
  if (handles[0] && handles[1]) {
    try {
      await client.upgradeToSecureChannel(handles[0].pub, handles[1].pub);
      channelUpgraded = true;
    } catch (e) {
      // Mark both as mismatch since the channel didn't actually come up.
      for (const a of att) {
        if (a.state === 'verified' || a.state === 'verified-vcek' || a.state === 'unsupported') {
          a.state = 'mismatch';
          a.detail = `channel upgrade failed: ${errorMessage(e)}`;
        }
      }
    }
  }

  // Operator-signed identity (REQ_ANNOUNCE), verified after the channel
  // decision (mirrors BatchPirClientAdapter). Binds each bundle against the
  // attested channel key captured in `handles` and that server's own
  // operator key; gate the badge on 'verified'.
  const operatorIdentity: OperatorIdentitySummary[] = [];
  for (let i = 0; i < servers.length; i++) {
    operatorIdentity.push({
      label: servers[i].label,
      identity: await verifyOperatorIdentityOne(client, servers[i], handles[i]),
    });
  }

  return { attestation: att, channelUpgraded, operatorIdentity };
}

/**
 * Fetch + gate one server's operator-signed identity. Never throws; folds
 * any failure into an `OperatorIdentity` snapshot. `handle` carries the
 * attested channel key (null when attest failed) the bundle's `channel_pub`
 * is bound against. Mirrors dpf-adapter.ts::verifyOperatorIdentityOne.
 */
async function verifyOperatorIdentityOne(
  client: ClientWithAttest,
  server: ServerLeg,
  handle: { pub: Uint8Array } | null,
): Promise<OperatorIdentity> {
  if (!handle) {
    return { state: 'error', error: 'attestation unavailable; cannot bind channel key' };
  }
  let v: WasmAnnounceVerification;
  try {
    v = await client.announce(server.index);
  } catch (e) {
    const msg = errorMessage(e);
    // A server started without --identity-* answers "announce not
    // configured" — an expected, benign state.
    if (/not configured/i.test(msg)) return { state: 'unconfigured' };
    return { state: 'error', error: msg };
  }
  try {
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));
    // maxAge 0n: only the future-dated guard runs (issued_at = boot time).
    const identity = gateOperatorIdentity(v, server.operatorPubkey, handle.pub, nowSecs, 0n);
    if (identity.state === 'verified' && identity.serverId !== server.stableServerId) {
      return {
        ...identity,
        state: 'unverified',
        error: `server_id ${identity.serverId ?? '?'} is not the pinned ${server.stableServerId}`,
      };
    }
    return identity;
  } finally {
    v.free();
  }
}

/**
 * Read each server's credits flags and, where credits are required, route
 * its metered frames through `provider`. Needs the sealed channel
 * (presentations are bearer material); never throws.
 */
async function enableCreditsOnAll(
  client: ClientWithAttest,
  servers: ServerLeg[],
  channelUpgraded: boolean,
  provider: CreditProvider,
): Promise<CreditsSummary[]> {
  const out: CreditsSummary[] = [];
  for (const s of servers) {
    if (!channelUpgraded) {
      out.push({ label: s.label, state: 'error', error: 'no sealed channel' });
      continue;
    }
    try {
      const state = (await client.enableCredits(s.index, provider)) as CreditsSummary['state'];
      out.push({ label: s.label, state });
    } catch (e) {
      out.push({ label: s.label, state: 'error', error: errorMessage(e) });
    }
  }
  return out;
}

// ── WasmQueryResult -> PlaygroundQueryResult ──────────────────────────────

function translateWasmEntries(wqr: {
  entryCount: number;
  totalBalance: bigint;
  isWhale: boolean;
  getEntry(i: number): { txid: string; vout: number; amountSats?: number; amount?: number } | null | undefined;
}): { utxos: PlaygroundUtxo[]; totalSats: bigint; isWhale: boolean } {
  const utxos: PlaygroundUtxo[] = [];
  for (let i = 0; i < wqr.entryCount; i++) {
    const e = wqr.getEntry(i);
    if (!e) continue;
    // WASM packs txid as raw 32-byte internal order — reverse for display.
    utxos.push({
      txidHex: reverseHex(e.txid),
      vout: Number(e.vout),
      amountSats: BigInt(e.amountSats ?? e.amount ?? 0),
    });
  }
  return {
    utxos,
    totalSats: wqr.totalBalance,
    isWhale: wqr.isWhale,
  };
}

function reverseHex(hex: string): string {
  let out = '';
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    out += hex.slice(i, i + 2);
  }
  return out;
}

/** The part of a result that exists before (or without) the query. */
type SessionFacts = Pick<
  PlaygroundQueryResult,
  'attestation' | 'operatorIdentity' | 'credits' | 'notes'
>;

function paymentRequiredResult(
  backend: Backend,
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
  t0: number,
  facts: SessionFacts,
  verification: PlaygroundQueryResult['verification'],
  message: string,
): PlaygroundQueryResult {
  return {
    backend,
    scriptPubKeyHex,
    scriptHashHex: bytesToHex(scriptHash),
    totalElapsedMs: performance.now() - t0,
    queryElapsedMs: 0,
    utxos: [],
    totalSats: 0n,
    isWhale: false,
    verification,
    merkleVerified: true,
    ...facts,
    paymentRequired: { message, approxCredits: RATE_CARD_CREDITS[backend] },
  };
}

// ── DPF + HarmonyPIR (wasm clients) ───────────────────────────────────────

interface WasmTwoServerClient extends ClientWithAttest {
  connect(): Promise<void>;
  fetchCatalog(): Promise<{ free?: () => void }>;
  queryBatchVerified(scriptHashes: Uint8Array, dbId: number): Promise<unknown>;
  disconnect(): Promise<void>;
  free?: () => void;
}

async function runTwoServerQuery(
  backend: 'dpf' | 'harmonypir',
  client: WasmTwoServerClient,
  servers: ServerLeg[],
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
  options: PlaygroundQueryOptions,
  extraNotes: string[],
): Promise<PlaygroundQueryResult> {
  const t0 = performance.now();
  const notes: string[] = [...extraNotes];
  try {
    await client.connect();

    const { attestation, channelUpgraded, operatorIdentity } = await attestAndUpgrade(
      client,
      servers,
    );
    if (!channelUpgraded) {
      throw new Error('attestation did not clear both servers; refusing to query over an unsealed channel');
    }
    const credits = await enableCreditsOnAll(
      client,
      servers,
      channelUpgraded,
      options.creditProvider ?? NO_CREDITS,
    );
    const facts: SessionFacts = { attestation, operatorIdentity, credits, notes };

    // Catalog warms the native-side state the query resolves `db_id` against.
    const catalog = await client.fetchCatalog();
    catalog.free?.();

    const qStart = performance.now();
    let wqrs: any[];
    try {
      // Query + per-bucket Merkle verification in one all-or-nothing call:
      // it returns only when every result verified against the published
      // tree tops (not-found results included, as absence proofs).
      wqrs = (await client.queryBatchVerified(scriptHash, 0)) as any[];
    } catch (e) {
      const msg = errorMessage(e);
      if (CREDITS_REFUSAL.test(msg)) {
        return paymentRequiredResult(backend, scriptHash, scriptPubKeyHex, t0, facts, 'merkle', msg);
      }
      throw e;
    }
    const qElapsed = performance.now() - qStart;

    if (wqrs.length !== 1) {
      throw new Error(`Expected 1 result, got ${wqrs.length}`);
    }
    const wqr = wqrs[0];
    const { utxos, totalSats, isWhale } = translateWasmEntries(wqr);
    if (typeof wqr.free === 'function') wqr.free();

    return {
      backend,
      scriptPubKeyHex,
      scriptHashHex: bytesToHex(scriptHash),
      totalElapsedMs: performance.now() - t0,
      queryElapsedMs: qElapsed,
      utxos,
      totalSats,
      isWhale,
      verification: 'merkle',
      merkleVerified: true,
      ...facts,
    };
  } finally {
    try {
      await client.disconnect();
    } catch {}
    client.free?.();
  }
}

const PIR1_LEG = (label: string, url: string): ServerLeg => ({
  url,
  label,
  pin: PIR1_PIN,
  index: 0,
  operatorPubkey: PIR1_PROVIDER.operatorPubkey,
  stableServerId: PIR1_PROVIDER.stableServerId,
});

const PIR2_LEG = (label: string, url: string): ServerLeg => ({
  url,
  label,
  pin: PIR2_TIER3_PIN,
  index: 1,
  operatorPubkey: PIR2_PROVIDER.operatorPubkey,
  stableServerId: PIR2_PROVIDER.stableServerId,
});

export async function runDpfQuery(
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
  options: PlaygroundQueryOptions = {},
): Promise<PlaygroundQueryResult> {
  const wasm = await loadWasm();
  const client = new wasm.WasmDpfClient(PIR1_URL, PIR2_URL);
  return runTwoServerQuery(
    'dpf',
    client as unknown as WasmTwoServerClient,
    [PIR1_LEG('server0 (pir1)', PIR1_URL), PIR2_LEG('server1 (pir2)', PIR2_URL)],
    scriptHash,
    scriptPubKeyHex,
    options,
    [],
  );
}

export async function runHarmonyQuery(
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
  options: PlaygroundQueryOptions = {},
): Promise<PlaygroundQueryResult> {
  const wasm = await loadWasm();
  const client = new wasm.WasmHarmonyClient(HINT_URL, QUERY_URL);
  return runTwoServerQuery(
    'harmonypir',
    client as unknown as WasmTwoServerClient,
    [PIR1_LEG('hint (pir1)', HINT_URL), PIR2_LEG('query (pir2)', QUERY_URL)],
    scriptHash,
    scriptPubKeyHex,
    options,
    ['HarmonyPIR fetches a one-time hint set (~140 MB) from the hint server before queries.'],
  );
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
export async function ensureOnionWasmFactory(): Promise<void> {
  type OnionFactory = (m?: object) => Promise<unknown>;
  type Holder = { __onionpirWasmFactory?: OnionFactory };
  const g = globalThis as unknown as Holder;
  if (g.__onionpirWasmFactory) return;
  // `webpackIgnore: true` tells webpack to leave the import alone; the
  // browser's native ESM loader fetches the .mjs from /public/wasm/.
  // The site serves from the root of sdk.bitcoinpir.org (custom domain —
  // see next.config.mjs), so `NEXT_PUBLIC_BASE_PATH` is the empty string and
  // the resolved URL is just `/wasm/...`.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const url = `${basePath}/wasm/onionpir_client.mjs`;
  const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ url)) as {
    default: OnionFactory;
  };
  g.__onionpirWasmFactory = mod.default;
}

function summarizeAdapterAttestation(
  url: string,
  label: string,
  pin: ServerAttestPin,
  a: ServerAttestation | null,
): AttestationSummary {
  if (!a || a.state === 'unattested') {
    return { url, label, state: 'error', detail: 'server was not attested', pin };
  }
  const base = {
    url,
    label,
    pin,
    binarySha256Hex: a.binarySha256Hex,
    gitRev: a.gitRev,
    launchMeasurementHex: a.launchMeasurementHex,
  };
  if (a.state === 'mismatch' || a.state === 'plaintext') {
    return { ...base, state: 'mismatch', detail: `attestation ${a.state} (sevStatus=${a.sevStatus ?? '?'})` };
  }
  if (a.sevStatus === 'noSevHost') {
    return {
      ...base,
      state: 'unsupported',
      detail: 'No SEV-SNP on this host (Hetzner i7-8700); binary pin only',
    };
  }
  if (a.state === 'verified-vcek') {
    return {
      ...base,
      state: 'verified-vcek',
      detail: `AMD VCEK chain validated, binary=${a.binarySha256Hex?.slice(0, 8) ?? '?'}…`,
    };
  }
  return {
    ...base,
    state: 'verified',
    detail: `SEV-SNP REPORT_DATA matches (binary=${a.binarySha256Hex?.slice(0, 8) ?? '?'}…)`,
  };
}

export async function runOnionPirQuery(
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
  options: PlaygroundQueryOptions = {},
): Promise<PlaygroundQueryResult> {
  // OnionPIR only talks to one server: pir1 (Hetzner).
  const url = PIR1_URL;
  const label = 'OnionPIR (pir1)';
  const t0 = performance.now();
  const notes: string[] = [
    'OnionPIR is a single-server FHE backend. SEAL doesn’t compile to wasm32 (the BFV core math runs in a separate hand-rolled WASM module).',
  ];
  await ensureOnionWasmFactory();

  let attestationInfo: ServerAttestation | null = null;
  let identity: OperatorIdentity = { state: 'not-checked' };
  let creditsInfo: CreditEnablement | null = null;
  const client = new OnionPirWebClient({
    serverUrl: url,
    expectedServerPin: PIR1_PIN,
    expectedServerId: PIR1_PROVIDER.stableServerId,
    pinnedOperatorPubkey: PIR1_PROVIDER.operatorPubkey,
    onAttestation: (status) => {
      attestationInfo = status;
    },
    onOperatorIdentity: (status) => {
      identity = status;
    },
    creditProvider: options.creditProvider ?? NO_CREDITS,
    onCredits: (status) => {
      creditsInfo = status;
    },
  });
  const facts = (): SessionFacts => ({
    attestation: [summarizeAdapterAttestation(url, label, PIR1_PIN, attestationInfo)],
    operatorIdentity: [{ label, identity }],
    credits: creditsInfo
      ? [{ label, state: (creditsInfo as CreditEnablement).state, error: (creditsInfo as CreditEnablement).error }]
      : [],
    notes,
  });
  try {
    await client.connect();

    const qStart = performance.now();
    let results: (QueryResult | null)[];
    let merkleVerified: boolean;
    try {
      results = await client.queryBatch([scriptHash], undefined, 0);
      // queryBatch does not verify on its own — drive the per-bin Merkle
      // proof rounds explicitly. An empty verdict list counts as untrusted
      // (runMerkleBatch), never as "nothing to check".
      merkleVerified = await runMerkleBatch(
        () => client.verifyMerkleBatch(results.filter((r): r is QueryResult => !!r)),
        notes,
      );
    } catch (e) {
      const msg = errorMessage(e);
      if (CREDITS_REFUSAL.test(msg)) {
        return paymentRequiredResult('onionpir', scriptHash, scriptPubKeyHex, t0, facts(), 'merkle', msg);
      }
      throw e;
    }
    const qElapsed = performance.now() - qStart;
    const out = translateLegacyResult(results[0]);

    return {
      backend: 'onionpir',
      scriptPubKeyHex,
      scriptHashHex: bytesToHex(scriptHash),
      totalElapsedMs: performance.now() - t0,
      queryElapsedMs: qElapsed,
      utxos: out.utxos,
      totalSats: out.totalSats,
      isWhale: out.isWhale,
      verification: 'merkle',
      merkleVerified,
      ...facts(),
    };
  } finally {
    try {
      client.disconnect();
    } catch {}
  }
}

// ── Direct ORAM backend (the free path) ───────────────────────────────────

/**
 * The production Direct ORAM client configuration, shared by the structured
 * "Run query" path and the snippet. Strict: attestation (AMD chain + pinned
 * binary + MEASUREMENT), the operator-signed identity of pir2, and a
 * database proof checked in the browser must all pass before any lookup, and
 * every lookup is one fixed-budget request (`PRODUCTION_ORAM_BATCH_PLANNER`).
 */
export function oramProductionConfig(creditProvider: CreditProvider = NO_CREDITS) {
  return {
    serverUrl: PIR2_PROVIDER.endpoint,
    strictVerification: true,
    expectedArkFingerprint: AMD_TURIN_ARK_FINGERPRINT,
    expectedServerPin: PIR2_PROVIDER.serverPin,
    expectedServerId: PIR2_PROVIDER.stableServerId,
    pinnedOperatorPubkey: PIR2_PROVIDER.operatorPubkey,
    verifyOperatorIdentity: true,
    databaseProofPins: PRODUCTION_ORAM_DB_PROOF_V2_PINS,
    batchPlanner: PRODUCTION_ORAM_BATCH_PLANNER,
    creditProvider,
  };
}

export async function runOramQuery(
  scriptHash: Uint8Array,
  scriptPubKeyHex: string,
  options: PlaygroundQueryOptions = {},
): Promise<PlaygroundQueryResult> {
  const url = PIR2_PROVIDER.endpoint;
  const label = 'ORAM (pir2)';
  const t0 = performance.now();
  const notes: string[] = [
    'Direct ORAM runs inside an AMD SEV-SNP guest: the server process sees the script hash, the host does not. Every lookup is one fixed-budget request (25 padded slots).',
  ];
  let creditsInfo: CreditEnablement | null = null;
  const client = new OramPirClientAdapter({
    ...oramProductionConfig(options.creditProvider ?? NO_CREDITS),
    onCredits: (status) => {
      creditsInfo = status;
    },
  });
  const facts = (): SessionFacts => ({
    attestation: [summarizeAdapterAttestation(url, label, PIR2_TIER3_PIN, client.attestation)],
    operatorIdentity: [{ label, identity: client.operatorIdentity }],
    credits: creditsInfo
      ? [{ label, state: (creditsInfo as CreditEnablement).state, error: (creditsInfo as CreditEnablement).error }]
      : [],
    notes,
  });
  try {
    await client.connect();
    const dbProof = client.getDatabaseProofStatus(0);

    const qStart = performance.now();
    let results: (QueryResult | null)[];
    try {
      results = await client.queryBatch([scriptHash], undefined, 0);
    } catch (e) {
      const msg = errorMessage(e);
      if (CREDITS_REFUSAL.test(msg)) {
        return paymentRequiredResult('oram', scriptHash, scriptPubKeyHex, t0, facts(), 'attested-oram', msg);
      }
      throw e;
    }
    const qElapsed = performance.now() - qStart;
    const out = translateLegacyResult(results[0]);

    return {
      backend: 'oram',
      scriptPubKeyHex,
      scriptHashHex: bytesToHex(scriptHash),
      totalElapsedMs: performance.now() - t0,
      queryElapsedMs: qElapsed,
      utxos: out.utxos,
      totalSats: out.totalSats,
      isWhale: out.isWhale,
      verification: 'attested-oram',
      // Strict mode refuses to query without a verified database proof, so a
      // returned result implies it; state it from the adapter anyway.
      merkleVerified: dbProof?.state === 'verified',
      ...facts(),
    };
  } finally {
    try {
      client.disconnect();
    } catch {}
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────

function translateLegacyResult(r: QueryResult | null | undefined): {
  utxos: PlaygroundUtxo[];
  totalSats: bigint;
  isWhale: boolean;
} {
  if (!r) {
    return { utxos: [], totalSats: 0n, isWhale: false };
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
  };
}

/**
 * Drive a per-result Merkle verification batch and reduce it to a single
 * trust verdict for the playground (we only run single-scripthash batches
 * here). Any throw is treated as untrusted — the proof either passed or
 * we couldn't prove it, never "skipped looks fine".
 */
async function runMerkleBatch(
  call: () => Promise<unknown>,
  notes: string[],
): Promise<boolean> {
  try {
    const verdicts = (await call()) as boolean[];
    if (!Array.isArray(verdicts) || verdicts.length === 0) {
      notes.push('Merkle verification returned no verdicts — treating as untrusted.');
      return false;
    }
    return verdicts.every(Boolean);
  } catch (e) {
    notes.push(`Merkle verification errored — treating as untrusted: ${errorMessage(e)}`);
    return false;
  }
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
  options: PlaygroundQueryOptions = {},
): Promise<PlaygroundQueryResult> {
  if (backend === 'dpf') return runDpfQuery(scriptHash, scriptPubKeyHex, options);
  if (backend === 'harmonypir') return runHarmonyQuery(scriptHash, scriptPubKeyHex, options);
  if (backend === 'onionpir') return runOnionPirQuery(scriptHash, scriptPubKeyHex, options);
  if (backend === 'oram') return runOramQuery(scriptHash, scriptPubKeyHex, options);
  throw new Error(`Unknown backend ${backend as string}`);
}
