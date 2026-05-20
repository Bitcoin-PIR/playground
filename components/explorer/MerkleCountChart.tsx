'use client';

import { useMemo } from 'react';
import type { CapturedFrame } from '@/lib/explorer/frame-tap';
import { EXPECTED_K, EXPECTED_K_CHUNK } from '@/lib/explorer/frame-tap';

interface Props {
  frames: CapturedFrame[];
}

/**
 * Per-Merkle-level pass count visualisation.
 *
 * INDEX Merkle frames travel as BUCKET_MERKLE_SIB_BATCH (0x33) or the
 * legacy MERKLE_SIBLING_BATCH (0x31). For every wire frame we observed,
 * we display the `groupCount` field — which equals K=75 on the
 * INDEX axis and K_CHUNK=80 on the CHUNK axis. Together with the
 * per-frame `keysPerGroup = 1` invariant, this gives a per-axis pass
 * count of `2 × n_servers × n_levels × n_pbc_rounds` for the 2
 * cuckoo positions per level.
 */
export function MerkleCountChart({ frames }: Props) {
  const merkleFrames = useMemo(() => {
    return frames.filter(
      (f) =>
        f.direction === 'tx' && (f.opcode === 0x33 || f.opcode === 0x31),
    );
  }, [frames]);

  const indexAxis = merkleFrames.filter((f) => f.groupCount === EXPECTED_K);
  const chunkAxis = merkleFrames.filter((f) => f.groupCount === EXPECTED_K_CHUNK);
  const offAxis = merkleFrames.filter(
    (f) =>
      f.groupCount !== null &&
      f.groupCount !== EXPECTED_K &&
      f.groupCount !== EXPECTED_K_CHUNK,
  );

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-800">
        Merkle per-level pass count
      </div>
      <div className="p-4 space-y-3">
        {merkleFrames.length === 0 ? (
          <div className="text-xs text-zinc-500">No Merkle frames observed yet.</div>
        ) : (
          <>
            <AxisRow
              label="INDEX-axis (groupCount=K=75)"
              count={indexAxis.length}
              expected={EXPECTED_K}
              color="bg-blue-500"
            />
            <AxisRow
              label="CHUNK-axis (groupCount=K_CHUNK=80)"
              count={chunkAxis.length}
              expected={EXPECTED_K_CHUNK}
              color="bg-emerald-500"
            />
            {offAxis.length > 0 && (
              <AxisRow
                label="Off-axis (UNEXPECTED)"
                count={offAxis.length}
                expected={0}
                color="bg-red-500"
                fail
              />
            )}
            <p className="mt-3 text-xs text-zinc-500">
              Per query, on either axis, the expected pass count is{' '}
              <code className="font-mono">2 × n_servers × n_levels × n_pbc_rounds</code>
              {' '}— 2 frames per (level × server) for the 2 cuckoo positions.
              Each frame carries <code className="font-mono">keysPerGroup = 1</code>{' '}
              on the wire (one DPF query per group; see{' '}
              <code className="font-mono">merkle_verify::encode_sibling_batch</code>).
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function AxisRow({
  label,
  count,
  expected,
  color,
  fail,
}: {
  label: string;
  count: number;
  expected: number;
  color: string;
  fail?: boolean;
}) {
  return (
    <div className="text-xs">
      <div className="flex items-baseline justify-between">
        <span className="font-mono">{label}</span>
        <span className={fail ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}>
          {count} frame(s)
          {expected > 0 && (
            <span className="ml-1 text-zinc-500">@ groupCount={expected}</span>
          )}
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-2 rounded ${color}`}
          style={{
            width: `${Math.min(100, count > 0 ? Math.min(100, count * 4) : 2)}%`,
          }}
        />
      </div>
    </div>
  );
}
