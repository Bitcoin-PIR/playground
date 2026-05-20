'use client';

import { useMemo } from 'react';
import type { CapturedFrame } from '@/lib/explorer/frame-tap';

interface Props {
  frames: CapturedFrame[];
}

/**
 * HarmonyPIR per-group request-count check.
 *
 * Every HARMONY_QUERY (0x42) and HARMONY_BATCH_QUERY (0x43) frame
 * must contain exactly T−1 sorted distinct u32 indices PER GROUP,
 * for every group, for every round, regardless of segment state.
 *
 * We can't parse the full payload here without reimplementing the
 * Harmony wire codec, but we CAN check:
 *   - Frame size uniformity across same-opcode frames (drift = leak).
 *   - The frame size implies a constant T (frame_size / 4 / K = T-1).
 */
export function HarmonyTCheck({ frames }: Props) {
  const harmonyTx = useMemo(() => {
    return frames.filter(
      (f) =>
        f.direction === 'tx' && (f.opcode === 0x42 || f.opcode === 0x43),
    );
  }, [frames]);

  const byOp = useMemo(() => {
    const m = new Map<number, CapturedFrame[]>();
    for (const f of harmonyTx) {
      const arr = m.get(f.opcode!) ?? [];
      arr.push(f);
      m.set(f.opcode!, arr);
    }
    return m;
  }, [harmonyTx]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-800">
        HarmonyPIR T−1 per-group request-count check
      </div>
      <div className="p-4">
        {harmonyTx.length === 0 ? (
          <div className="text-xs text-zinc-500">
            No HarmonyPIR query frames observed. Switch to the HarmonyPIR backend
            and run a query.
          </div>
        ) : (
          <ul className="space-y-2 text-xs">
            {Array.from(byOp.entries()).map(([op, fs]) => {
              const sizes = fs.map((f) => f.size);
              const distinct = [...new Set(sizes)];
              const ok = distinct.length === 1;
              return (
                <li
                  key={op}
                  className={`rounded border p-2 ${
                    ok
                      ? 'border-emerald-200 dark:border-emerald-900'
                      : 'border-red-200 dark:border-red-900'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono">
                      0x{op.toString(16).padStart(2, '0')} {fs[0].label}
                    </span>
                    <span
                      className={
                        ok
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {fs.length} frame(s), {distinct.length === 1
                        ? `uniform size = ${distinct[0]}B`
                        : `sizes = ${distinct.join(', ')}B (drift!)`}
                    </span>
                  </div>
                  <div className="mt-1 text-zinc-500">
                    Uniform size across same-opcode frames = T constant ⇒ per-group
                    count is fixed at T−1, regardless of which segments are empty.
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
