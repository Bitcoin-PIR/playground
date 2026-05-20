'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CapturedFrame } from '@/lib/explorer/frame-tap';
import { loadWasm } from '@/lib/wasm-loader';

interface Props {
  frames: CapturedFrame[];
}

type Decoder = ((frame: Uint8Array) => Uint32Array) | null;

/**
 * HarmonyPIR per-group request-count check.
 *
 * Every HARMONY_BATCH_QUERY (0x43) frame must carry, for every group,
 * exactly T−1 sorted distinct u32 indices — regardless of segment
 * state, query count, or round. (CLAUDE.md "HarmonyPIR Per-Group
 * Request-Count Symmetry" invariant.)
 *
 * We use the wasm-bindgen `harmony_decode_counts` helper (added in
 * pir-sdk-wasm #6) to extract the per-group `indices.len()` field from
 * every captured TX 0x43 frame. The invariant passes iff every
 * extracted count across every group across every frame is identical.
 *
 * For 0x42 (HARMONY_QUERY, singular — different wire layout, no batch
 * decoder yet) we fall back to a coarser size-uniformity check.
 */
export function HarmonyTCheck({ frames }: Props) {
  const [decoder, setDecoder] = useState<Decoder>(null);
  const [wasmError, setWasmError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWasm()
      .then((mod) => {
        if (cancelled) return;
        const fn = (mod as { harmony_decode_counts?: typeof mod.harmony_decode_counts })
          .harmony_decode_counts;
        if (typeof fn === 'function') setDecoder(() => fn);
        else setWasmError('harmony_decode_counts not exported by loaded WASM');
      })
      .catch((e) => !cancelled && setWasmError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => {
    const batchFrames = frames.filter(
      (f) => f.direction === 'tx' && f.opcode === 0x43 && f.rawBytes,
    );
    const singularFrames = frames.filter(
      (f) => f.direction === 'tx' && f.opcode === 0x42,
    );

    if (!decoder && batchFrames.length === 0 && singularFrames.length === 0) {
      return null;
    }

    let decodeError: string | null = null;
    // Per-frame entry: counts + intra-frame uniformity. The privacy
    // invariant is per-segment-class (each batch frame carries one
    // class, so all groups WITHIN a frame share T) — different frames
    // (INDEX vs CHUNK vs each Merkle level) legitimately have different
    // T values. Check intra-frame, not global.
    const perFrame: {
      seq: number;
      counts: number[];
      distinct: number[];
      ok: boolean;
    }[] = [];

    if (decoder) {
      for (const f of batchFrames) {
        try {
          const u = decoder(f.rawBytes!);
          const counts = Array.from(u);
          const distinct = [...new Set(counts)];
          perFrame.push({
            seq: f.seq,
            counts,
            distinct,
            ok: distinct.length === 1,
          });
        } catch (e) {
          decodeError = `frame seq=${f.seq}: ${(e as Error).message}`;
          break;
        }
      }
    }

    const allFramesPass = perFrame.length > 0 && perFrame.every((p) => p.ok);
    const distinctTValues = [...new Set(perFrame.map((p) => p.distinct[0]))]
      .filter((v) => v !== undefined)
      .sort((a, b) => a - b);

    const singularSizes = singularFrames.map((f) => f.size);
    const singularDistinct = [...new Set(singularSizes)];

    return {
      decodeError,
      batchFrameCount: batchFrames.length,
      perFrame,
      allFramesPass,
      distinctTValues,
      singularFrameCount: singularFrames.length,
      singularSizes: singularDistinct,
    };
  }, [frames, decoder]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-800">
        HarmonyPIR T−1 per-group request-count check
      </div>
      <div className="p-4 space-y-3 text-xs">
        {wasmError && (
          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            WASM load failed: {wasmError}. Falling back to size-uniformity only.
          </div>
        )}

        {(!result || (result.batchFrameCount === 0 && result.singularFrameCount === 0)) && (
          <div className="text-zinc-500">
            No HarmonyPIR query frames observed. Switch to the HarmonyPIR backend
            and run a query.
          </div>
        )}

        {result?.decodeError && (
          <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            decode error: {result.decodeError}
          </div>
        )}

        {result && result.batchFrameCount > 0 && !result.decodeError && (
          <BatchCard
            frames={result.batchFrameCount}
            allPass={result.allFramesPass}
            distinctTValues={result.distinctTValues}
            perFrame={result.perFrame}
          />
        )}

        {result && result.singularFrameCount > 0 && (
          <SingularCard
            count={result.singularFrameCount}
            sizes={result.singularSizes}
          />
        )}
      </div>
    </div>
  );
}

function BatchCard({
  frames,
  allPass,
  distinctTValues,
  perFrame,
}: {
  frames: number;
  allPass: boolean;
  distinctTValues: number[];
  perFrame: { seq: number; counts: number[]; distinct: number[]; ok: boolean }[];
}) {
  const failures = perFrame.filter((p) => !p.ok);
  return (
    <div
      className={`rounded border p-2 ${
        allPass
          ? 'border-emerald-200 dark:border-emerald-900'
          : 'border-red-200 dark:border-red-900'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono">0x43 HARMONY_BATCH_QUERY</span>
        <span
          className={
            allPass
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }
        >
          {allPass
            ? `PASS — ${frames}/${frames} frames internally uniform`
            : `FAIL — ${failures.length}/${frames} frames have intra-frame count drift`}
        </span>
      </div>
      <div className="mt-1 text-zinc-500">
        Each batch frame carries one segment class (INDEX / CHUNK / a specific
        Merkle level); within a frame all groups share T, so the privacy
        invariant requires <em>intra-frame</em> count uniformity. Different
        frames legitimately use different T values for different segment sizes.
      </div>
      <div className="mt-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
        Observed T−1 values across {frames} frames: {'{'}
        {distinctTValues.join(', ')}
        {'}'}
        {distinctTValues.length > 1 &&
          ` — ${distinctTValues.length} distinct segment classes`}
      </div>
      {failures.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-[11px] text-red-700 dark:text-red-300">
          {failures.slice(0, 3).map((f) => (
            <li key={f.seq}>
              frame seq={f.seq}: distinct counts = {'{'}
              {f.distinct.join(', ')}
              {'}'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SingularCard({ count, sizes }: { count: number; sizes: number[] }) {
  const ok = sizes.length === 1;
  return (
    <div
      className={`rounded border p-2 ${
        ok
          ? 'border-emerald-200 dark:border-emerald-900'
          : 'border-red-200 dark:border-red-900'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono">0x42 HARMONY_QUERY (singular)</span>
        <span
          className={
            ok
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }
        >
          {count} frame(s),{' '}
          {ok ? `uniform size = ${sizes[0]}B` : `sizes = ${sizes.join(', ')}B (drift!)`}
        </span>
      </div>
      <div className="mt-1 text-zinc-500">
        Falls back to frame-size uniformity (no batch decoder for 0x42 yet).
        Constant size across same-opcode frames ⇒ constant per-group count.
      </div>
    </div>
  );
}
