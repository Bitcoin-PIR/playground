'use client';

import { useMemo, useState } from 'react';
import type { CapturedFrame } from '@/lib/explorer/frame-tap';

interface Props {
  frames: CapturedFrame[];
  /** Index of the frame currently highlighted, or null. */
  selected?: number | null;
  onSelect?: (idx: number | null) => void;
}

type DirFilter = 'all' | 'tx' | 'rx';

/**
 * Frame-by-frame timeline. Filterable by direction, by socket, by
 * opcode label; sortable by sequence (default).
 *
 * Each row shows: seq, t (ms), socket #, direction arrow, opcode label,
 * bytes, group count / kpg, hex preview.
 */
export function FrameTimeline({ frames, selected = null, onSelect }: Props) {
  const [dir, setDir] = useState<DirFilter>('all');
  const [labelFilter, setLabelFilter] = useState('');
  const [socketFilter, setSocketFilter] = useState<'all' | number>('all');

  const socketIds = useMemo(() => {
    const s = new Set<number>();
    for (const f of frames) s.add(f.socketId);
    return Array.from(s).sort((a, b) => a - b);
  }, [frames]);

  const filtered = useMemo(() => {
    return frames.filter((f) => {
      if (dir !== 'all' && f.direction !== dir) return false;
      if (socketFilter !== 'all' && f.socketId !== socketFilter) return false;
      if (labelFilter && !f.label.toLowerCase().includes(labelFilter.toLowerCase()))
        return false;
      return true;
    });
  }, [frames, dir, labelFilter, socketFilter]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="text-sm font-semibold">Frame timeline</div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            <span className="text-zinc-500">dir</span>
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value as DirFilter)}
              className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="all">all</option>
              <option value="tx">tx (client → server)</option>
              <option value="rx">rx (server → client)</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-zinc-500">socket</span>
            <select
              value={socketFilter === 'all' ? 'all' : `${socketFilter}`}
              onChange={(e) =>
                setSocketFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="all">all</option>
              {socketIds.map((id) => (
                <option key={id} value={id}>
                  #{id}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            placeholder="filter by label…"
            className="w-40 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-zinc-500">
            {filtered.length}/{frames.length} frames
          </span>
        </div>
      </div>

      <div className="max-h-[480px] overflow-auto">
        <table className="w-full font-mono text-xs">
          <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-1.5">seq</th>
              <th className="px-3 py-1.5">t (ms)</th>
              <th className="px-3 py-1.5">sock</th>
              <th className="px-3 py-1.5">dir</th>
              <th className="px-3 py-1.5">label</th>
              <th className="px-3 py-1.5 text-right">size</th>
              <th className="px-3 py-1.5 text-right">group×kpg</th>
              <th className="px-3 py-1.5">hex preview</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                  {frames.length === 0
                    ? 'No frames captured yet. Run a query to start the tap.'
                    : 'No frames match the current filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((f) => {
                const isSelected = selected === f.seq;
                return (
                  <tr
                    key={f.seq}
                    onClick={() => onSelect?.(isSelected ? null : f.seq)}
                    className={`cursor-pointer border-t border-zinc-100 dark:border-zinc-800 ${
                      isSelected
                        ? 'bg-bitcoin/10'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <td className="px-3 py-1 text-zinc-500">{f.seq}</td>
                    <td className="px-3 py-1 text-zinc-500">{f.tMs}</td>
                    <td className="px-3 py-1 text-zinc-500">#{f.socketId}</td>
                    <td className="px-3 py-1">
                      <span
                        className={
                          f.direction === 'tx'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {f.direction === 'tx' ? '→' : '←'}
                      </span>
                    </td>
                    <td className="px-3 py-1 font-semibold">
                      {f.label}
                      {f.isChunkPart && (
                        <span className="ml-1 rounded bg-zinc-200 px-1 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          chunk
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-right text-zinc-700 dark:text-zinc-300">
                      {f.size}
                    </td>
                    <td className="px-3 py-1 text-right text-zinc-700 dark:text-zinc-300">
                      {f.groupCount !== null && f.keysPerGroup !== null
                        ? `${f.groupCount}×${f.keysPerGroup}`
                        : '—'}
                    </td>
                    <td className="px-3 py-1 text-zinc-500">
                      <code className="break-all">{f.hexPreview}</code>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
