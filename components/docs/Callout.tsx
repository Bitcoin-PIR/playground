import type { ReactNode } from 'react';

type CalloutKind = 'note' | 'warn' | 'tip' | 'danger';

const STYLES: Record<CalloutKind, { ring: string; bg: string; label: string; labelColor: string }> = {
  note: {
    ring: 'border-zinc-300 dark:border-zinc-700',
    bg: 'bg-zinc-50 dark:bg-zinc-900',
    label: 'Note',
    labelColor: 'text-zinc-700 dark:text-zinc-300',
  },
  tip: {
    ring: 'border-emerald-300 dark:border-emerald-800',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    label: 'Tip',
    labelColor: 'text-emerald-800 dark:text-emerald-300',
  },
  warn: {
    ring: 'border-amber-300 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    label: 'Heads up',
    labelColor: 'text-amber-800 dark:text-amber-300',
  },
  danger: {
    ring: 'border-rose-300 dark:border-rose-800',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    label: 'Important',
    labelColor: 'text-rose-800 dark:text-rose-300',
  },
};

export function Callout({
  kind = 'note',
  title,
  children,
}: {
  kind?: CalloutKind;
  title?: string;
  children: ReactNode;
}) {
  const s = STYLES[kind];
  return (
    <div className={`my-6 rounded-lg border ${s.ring} ${s.bg} p-4`}>
      <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${s.labelColor}`}>
        {title ?? s.label}
      </div>
      <div className="text-sm leading-6 text-zinc-700 dark:text-zinc-200 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
