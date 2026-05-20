'use client';

import { EXPECTED_K, EXPECTED_K_CHUNK } from '@/lib/explorer/frame-tap';
import type { CapturedFrame } from '@/lib/explorer/frame-tap';

interface Props {
  frames: CapturedFrame[];
}

/**
 * Visualise the K-padding invariant by drawing a fixed-size grid of
 * K (=75) boxes for the INDEX round and K_CHUNK (=80) boxes for the
 * CHUNK round.
 *
 * We deliberately do NOT mark which boxes are "real" vs "dummy" —
 * that's precisely the information the K-padding hides from the
 * server. The visualisation shows what the *server* sees: a uniform
 * grid of K group queries, content-indistinguishable.
 *
 * What we DO show: the actual `count` value extracted from the
 * captured INDEX_BATCH / CHUNK_BATCH frame, alongside the expected
 * constant. If the count differs, the visualisation drops a red ring
 * around the affected row.
 */
export function PaddingViz({ frames }: Props) {
  const indexFrame =
    frames.find((f) => f.direction === 'tx' && f.opcode === 0x11) ?? null;
  const chunkFrame =
    frames.find((f) => f.direction === 'tx' && f.opcode === 0x21) ?? null;

  const indexCount = indexFrame?.groupCount ?? null;
  const chunkCount = chunkFrame?.groupCount ?? null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-800">
        K-padding visualisation
      </div>
      <div className="p-4">
        <Row
          label="INDEX round"
          expected={EXPECTED_K}
          actual={indexCount}
          haveFrame={!!indexFrame}
          color="bg-blue-500"
        />
        <div className="h-3" />
        <Row
          label="CHUNK round"
          expected={EXPECTED_K_CHUNK}
          actual={chunkCount}
          haveFrame={!!chunkFrame}
          color="bg-emerald-500"
        />
        <p className="mt-4 text-xs text-zinc-500">
          Each box is one PBC group query. Every group is byte-indistinguishable
          to the server — real queries and dummy padding are colour-equal here
          because they are colour-equal on the wire.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  expected,
  actual,
  haveFrame,
  color,
}: {
  label: string;
  expected: number;
  actual: number | null;
  haveFrame: boolean;
  color: string;
}) {
  const ok = actual === expected;
  const ringClass = !haveFrame
    ? 'ring-zinc-300 dark:ring-zinc-700'
    : ok
      ? 'ring-emerald-500'
      : 'ring-red-500';
  return (
    <div className={`rounded-md p-3 ring-2 ${ringClass}`}>
      <div className="flex items-baseline justify-between text-xs">
        <div className="font-semibold">{label}</div>
        <div className="font-mono">
          {haveFrame ? (
            <span>
              count = <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{actual}</span>
              <span className="text-zinc-500"> / expected K = {expected}</span>
            </span>
          ) : (
            <span className="text-zinc-500">(no frame yet)</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {Array.from({ length: expected }, (_, i) => (
          <span
            key={i}
            className={`inline-block size-3 rounded-sm ${
              haveFrame ? color : 'bg-zinc-200 dark:bg-zinc-800'
            }`}
            title={`group ${i}`}
          />
        ))}
      </div>
    </div>
  );
}
