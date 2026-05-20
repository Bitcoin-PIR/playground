import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
// added for /docs
import { Callout } from '@/components/docs/Callout';
import { Invariant } from '@/components/docs/Invariant';
import { BackendMatrix } from '@/components/docs/BackendMatrix';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="mt-8 mb-4 text-3xl font-bold tracking-tight">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 mb-3 border-b border-zinc-200 pb-2 text-2xl font-semibold tracking-tight dark:border-zinc-800">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-2 text-xl font-semibold">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 mb-2 text-base font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
        {children}
      </h4>
    ),
    p: ({ children }) => <p className="my-4 leading-7">{children}</p>,
    a: ({ href, children }) => {
      // added for /docs — Next-routed link for internal hrefs so client navigation works
      const internal = href && (href.startsWith('/') || href.startsWith('#'));
      const className =
        'text-bitcoin underline decoration-bitcoin/30 underline-offset-2 hover:decoration-bitcoin';
      if (internal && href.startsWith('/')) {
        return (
          <Link href={href} className={className}>
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          className={className}
          target={internal ? undefined : '_blank'}
          rel={internal ? undefined : 'noreferrer'}
        >
          {children}
        </a>
      );
    },
    ul: ({ children }) => <ul className="my-4 list-disc space-y-1 pl-6">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-1 pl-6">{children}</ol>,
    li: ({ children }) => <li className="leading-7">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-zinc-300 pl-4 italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b-2 border-zinc-300 dark:border-zinc-700">{children}</thead>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-zinc-200 dark:border-zinc-800">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{children}</td>
    ),
    code: ({ children, ...rest }) => (
      <code
        className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800"
        {...rest}
      >
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-4 overflow-x-auto rounded-md bg-zinc-900 p-4 font-mono text-sm text-zinc-100">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-8 border-zinc-200 dark:border-zinc-800" />,
    // added for /docs
    Callout,
    Invariant,
    BackendMatrix,
    ...components,
  };
}
