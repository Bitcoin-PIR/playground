import type { ReactNode } from 'react';

/**
 * Two-framing invariant card.
 *
 * The user-facing line answers "what does this guarantee me?". The
 * technical statement is the precise wire-shape property maintainers
 * need to preserve.
 */
export function Invariant({
  index,
  title,
  userFacing,
  technical,
  children,
}: {
  index: number;
  title: string;
  userFacing: string;
  technical: string;
  children?: ReactNode;
}) {
  return (
    <section className="my-8 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <span className="rounded-md bg-bitcoin/10 px-2 py-0.5 font-mono text-xs font-semibold text-bitcoin">
          #{index}
        </span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            For wallet users
          </div>
          <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{userFacing}</p>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Wire-shape property
          </div>
          <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{technical}</p>
        </div>
      </div>
      {children ? (
        <div className="border-t border-zinc-200 px-5 py-4 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] dark:[&_code]:bg-zinc-800">
          {children}
        </div>
      ) : null}
    </section>
  );
}
