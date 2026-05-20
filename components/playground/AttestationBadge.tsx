'use client';

import type { AttestationSummary } from '@/lib/playground-clients';

export function AttestationBadge({ att }: { att: AttestationSummary }) {
  const { tone, text } = toneFor(att.state);
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border px-3 py-2 ${tone}`}
      title={att.detail}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block size-2 rounded-full bg-current opacity-80" />
        <span className="font-medium">{att.label}</span>
        <span className="ml-auto text-xs uppercase tracking-wide">{text}</span>
      </div>
      <div className="text-xs opacity-80 break-words">{att.detail}</div>
      {att.binarySha256Hex && (
        <div className="font-mono text-[10px] opacity-60">
          binary={att.binarySha256Hex.slice(0, 16)}…
          {att.launchMeasurementHex
            ? ` · measurement=${att.launchMeasurementHex.slice(0, 16)}…`
            : ''}
        </div>
      )}
    </div>
  );
}

function toneFor(s: AttestationSummary['state']): { tone: string; text: string } {
  switch (s) {
    case 'verified-vcek':
      return {
        tone: 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
        text: 'AMD chain ok',
      };
    case 'verified':
      return {
        tone: 'border-emerald-400 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
        text: 'SEV report ok',
      };
    case 'unsupported':
      return {
        tone: 'border-zinc-400 bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
        text: 'no SEV — pin only',
      };
    case 'mismatch':
      return {
        tone: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200',
        text: 'mismatch',
      };
    case 'error':
      return {
        tone: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
        text: 'error',
      };
  }
}
