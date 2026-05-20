import Link from 'next/link';
import { prevNext } from './nav';

export function PrevNext({ slug }: { slug: string }) {
  const { prev, next } = prevNext(slug);
  if (!prev && !next) return null;

  return (
    <div className="mt-16 grid gap-3 border-t border-zinc-200 pt-8 sm:grid-cols-2 dark:border-zinc-800">
      {prev ? (
        <Link
          href={prev.slug ? `/docs/${prev.slug}` : '/docs'}
          className="group rounded-lg border border-zinc-200 p-4 transition hover:border-bitcoin dark:border-zinc-800"
        >
          <div className="text-xs uppercase tracking-wider text-zinc-500">Previous</div>
          <div className="mt-1 font-semibold group-hover:text-bitcoin">{prev.title}</div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.slug ? `/docs/${next.slug}` : '/docs'}
          className="group rounded-lg border border-zinc-200 p-4 text-right transition hover:border-bitcoin dark:border-zinc-800"
        >
          <div className="text-xs uppercase tracking-wider text-zinc-500">Next</div>
          <div className="mt-1 font-semibold group-hover:text-bitcoin">{next.title}</div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
