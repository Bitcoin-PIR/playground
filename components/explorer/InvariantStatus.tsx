'use client';

import { useState } from 'react';
import type { InvariantReport, InvariantResult } from '@/lib/explorer/invariants';

interface Props {
  report: InvariantReport;
}

const STATE_COLOR: Record<InvariantResult['state'], string> = {
  pass: 'bg-emerald-500',
  fail: 'bg-red-500',
  pending: 'bg-amber-500',
  // `internal` reads as "holds, but verified in SDK code, not from
  // this wire trace" — render as muted emerald (ring rather than
  // solid fill) so it's visually distinct from `pass` but still
  // clearly a positive signal, not a gray non-result.
  internal: 'bg-emerald-200 dark:bg-emerald-800',
  'n/a': 'bg-zinc-300 dark:bg-zinc-700',
};

const STATE_LABEL: Record<InvariantResult['state'], string> = {
  pass: 'PASS',
  fail: 'FAIL',
  pending: 'WAIT',
  internal: 'IN SDK',
  'n/a': 'n/a',
};

const STATE_TEXT: Record<InvariantResult['state'], string> = {
  pass: 'text-emerald-600 dark:text-emerald-400',
  fail: 'text-red-600 dark:text-red-400',
  pending: 'text-amber-600 dark:text-amber-400',
  internal: 'text-emerald-700/80 dark:text-emerald-300/80',
  'n/a': 'text-zinc-500',
};

const OVERALL_LABEL = {
  pass: { text: 'ALL PASS', cls: 'text-emerald-600 dark:text-emerald-400' },
  fail: { text: 'FAIL', cls: 'text-red-600 dark:text-red-400' },
  pending: { text: 'AWAITING DATA', cls: 'text-amber-600 dark:text-amber-400' },
  'no-data': { text: 'no traffic yet', cls: 'text-zinc-500' },
  na: { text: 'no applicable checks', cls: 'text-zinc-500' },
} as const;

function OverallBadge({ overall }: { overall: keyof typeof OVERALL_LABEL }) {
  const { text, cls } = OVERALL_LABEL[overall];
  return <div className={`text-xs font-semibold ${cls}`}>{text}</div>;
}

export function InvariantStatus({ report }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="text-sm font-semibold">Privacy invariants</div>
        <OverallBadge overall={report.overall} />
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {report.results.map((r) => {
          const open = expanded[r.id] ?? false;
          return (
            <li key={r.id}>
              <button
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [r.id]: !open }))
                }
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span
                  className={`mt-1 inline-block size-3 shrink-0 rounded-full ${STATE_COLOR[r.state]}`}
                  aria-label={STATE_LABEL[r.state]}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{r.title}</span>
                    <span className={`text-[10px] font-mono ${STATE_TEXT[r.state]}`}>
                      {STATE_LABEL[r.state]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {r.summary}
                  </div>
                </div>
                <span className="text-zinc-400">{open ? '▾' : '▸'}</span>
              </button>
              {open && r.detail.length > 0 && (
                <div className="bg-zinc-50 px-4 py-2 dark:bg-zinc-900/50">
                  <table className="w-full font-mono text-xs">
                    <tbody>
                      {r.detail.map((d, i) => (
                        <tr key={i} className="align-top">
                          <td className="py-0.5 pr-3 text-zinc-500">{d.label}</td>
                          <td
                            className={`py-0.5 ${
                              d.ok === false
                                ? 'text-red-600 dark:text-red-400'
                                : d.ok === true
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : ''
                            }`}
                          >
                            {d.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
