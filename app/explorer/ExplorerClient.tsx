'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BackendSelector, type Backend } from '@/components/BackendSelector';
import { FrameTimeline } from '@/components/explorer/FrameTimeline';
import { InvariantStatus } from '@/components/explorer/InvariantStatus';
import { PaddingViz } from '@/components/explorer/PaddingViz';
import { MerkleCountChart } from '@/components/explorer/MerkleCountChart';
import { FoundVsNotFoundDiff } from '@/components/explorer/FoundVsNotFoundDiff';
import { HarmonyTCheck } from '@/components/explorer/HarmonyTCheck';
import {
  FrameTap,
  type CapturedFrame,
} from '@/lib/explorer/frame-tap';
import { checkInvariants } from '@/lib/explorer/invariants';
import { runQuery } from '@/lib/explorer/runner';
import { loadWasm } from '@/lib/wasm-loader';

/**
 * Example P2PKH address (mainnet) corresponding to the first entry of
 * `web/src/example_spks.json` in the main repo — known to be in the
 * served snapshot. Use as the default "found" demo input.
 */
const DEFAULT_ADDRESS = '1D4HSHPJxoPLqiBNFNarz34dcWPLvpiaeb';

export function ExplorerClient() {
  const [backend, setBackend] = useState<Backend>('dpf');
  const [input, setInput] = useState(DEFAULT_ADDRESS);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);

  const tapRef = useRef<FrameTap | null>(null);
  const [harmonyDecodeCounts, setHarmonyDecodeCounts] = useState<
    ((frame: Uint8Array) => Uint32Array) | null
  >(null);

  // Live-update on every captured frame.
  useEffect(() => {
    return () => {
      tapRef.current?.dispose();
      tapRef.current = null;
    };
  }, []);

  // Load the WASM decoder once so invariant 4 (HarmonyPIR T−1) can fire
  // on captured 0x43 frames instead of staying n/a.
  useEffect(() => {
    let cancelled = false;
    loadWasm()
      .then((mod) => {
        if (cancelled) return;
        const fn = mod.harmony_decode_counts;
        if (typeof fn === 'function') {
          setHarmonyDecodeCounts(() => fn.bind(mod));
        }
      })
      .catch(() => {
        /* invariant 4 stays n/a; the panel logs the reason itself */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const invariants = useMemo(
    () => checkInvariants(frames, { harmonyDecodeCounts: harmonyDecodeCounts ?? undefined }),
    [frames, harmonyDecodeCounts],
  );

  async function onRun() {
    setRunning(true);
    setError(null);
    setOutcome(null);
    setFrames([]);
    setSelectedSeq(null);

    // Fresh tap for each run. Stream frames into React state so the
    // UI updates live during the query.
    const tap = new FrameTap();
    tapRef.current?.dispose();
    tapRef.current = tap;

    let unsubscribe: (() => void) | null = null;
    try {
      tap.attach();
      unsubscribe = tap.addListener(() => {
        setFrames(tap.snapshot());
      });

      const result = await runQuery({ backend, input, tap });
      setFrames(result.frames);
      setOutcome(result.outcome);
      if (result.error) setError(result.error);
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
    } finally {
      unsubscribe?.();
      tap.dispose();
      tapRef.current = null;
      setRunning(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* ── Controls ──────────────────────────────────────────────── */}
      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          1. Pick a backend &amp; run a query
        </h2>
        <div className="mt-3">
          <BackendSelector value={backend} onChange={setBackend} />
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block flex-1 min-w-[260px]">
            <div className="mb-1 text-xs text-zinc-500">
              Bitcoin address, P2PKH/P2SH/bech32 — OR a raw scriptPubKey hex
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="bc1q… / 1… / 3… / hex"
              className="block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            onClick={onRun}
            disabled={running || !input.trim()}
            className="rounded-md bg-bitcoin px-3 py-1.5 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run query'}
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}
        {outcome && (
          <div className="mt-2 rounded bg-zinc-50 px-3 py-1.5 text-xs dark:bg-zinc-900">
            {outcome}
          </div>
        )}
        {backend === 'onionpir' && (
          <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            <strong>Note:</strong> the OnionPIR FHE module
            (<code className="font-mono">onionpir_client.mjs</code> +{' '}
            <code className="font-mono">.wasm</code>) is not vendored in this
            playground. Running a query against OnionPIR will fetch a single
            INFO frame from <code className="font-mono">weikeng2</code> so you
            can observe the handshake but will not drive a full FHE query.
            Use DPF or HarmonyPIR for the full invariant demo.
          </div>
        )}
      </section>

      {/* ── Top dashboard: invariants + padding viz ────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <InvariantStatus report={invariants} />
        <div className="space-y-4">
          <PaddingViz frames={frames} />
          <MerkleCountChart frames={frames} />
        </div>
      </section>

      {/* ── HarmonyPIR-specific check ──────────────────────────── */}
      {(backend === 'harmonypir' || frames.some((f) => f.opcode === 0x42 || f.opcode === 0x43)) && (
        <section>
          <HarmonyTCheck frames={frames} />
        </section>
      )}

      {/* ── Frame timeline ─────────────────────────────────────── */}
      <section>
        <FrameTimeline frames={frames} selected={selectedSeq} onSelect={setSelectedSeq} />
      </section>

      {/* ── Found vs not-found diff ────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          2. Found vs. not-found wire-shape diff
        </h2>
        <FoundVsNotFoundDiff backend={backend} />
      </section>

      {/* ── Methodology footer ─────────────────────────────────── */}
      <section className="rounded-lg border border-dashed border-zinc-300 p-4 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">
          Methodology
        </div>
        <p className="mt-2">
          The explorer wraps{' '}
          <code className="font-mono">window.WebSocket</code> with a
          subclass that records every <code className="font-mono">send()</code>{' '}
          call and every received <code className="font-mono">message</code>{' '}
          event before forwarding them to the real socket. The vendored
          DPF/HarmonyPIR WASM client and the OnionPIR TS client both call
          the global <code className="font-mono">new WebSocket(url)</code>{' '}
          constructor at connect-time, so the patched subclass picks up
          every frame they exchange with the server. The frame body is
          parsed against the documented wire layout (
          <code className="font-mono">[4B len LE][1B opcode][payload]</code>
          ) to extract <code className="font-mono">count</code>,{' '}
          <code className="font-mono">keysPerGroup</code>, and the opcode
          label without decrypting any payload bytes — all four privacy
          invariants are observable on the unencrypted wire-format
          envelope.
        </p>
        <p className="mt-2">
          The DPF and HarmonyPIR clients normally upgrade to an encrypted
          channel after attestation. The explorer skips that upgrade
          intentionally — with ChaCha20 ciphertext on the wire the
          invariants would still hold but would no longer be parseable
          from JS. Production wallets MUST enable the channel; the
          plaintext mode here is observation-only.
        </p>
      </section>
    </div>
  );
}
