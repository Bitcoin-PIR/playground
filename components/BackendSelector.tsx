'use client';

import { useState } from 'react';

export type Backend = 'dpf' | 'harmonypir' | 'onionpir';

export const BACKENDS: { id: Backend; label: string; tagline: string }[] = [
  { id: 'dpf', label: 'DPF-PIR', tagline: 'two-server, low-latency, batch scans' },
  { id: 'harmonypir', label: 'HarmonyPIR', tagline: 'two-server, offline-phase, big batches' },
  { id: 'onionpir', label: 'OnionPIR', tagline: 'one-server FHE, single lookups' },
];

export function BackendSelector({
  value,
  onChange,
}: {
  value: Backend;
  onChange: (b: Backend) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {BACKENDS.map((b) => (
        <button
          key={b.id}
          onClick={() => onChange(b.id)}
          className={`rounded-lg border p-4 text-left transition ${
            value === b.id
              ? 'border-bitcoin bg-bitcoin/5'
              : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600'
          }`}
        >
          <div className="font-semibold">{b.label}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{b.tagline}</div>
        </button>
      ))}
    </div>
  );
}
