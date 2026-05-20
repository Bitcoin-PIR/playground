import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="mt-8 mb-4 text-3xl font-bold tracking-tight">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-8 mb-3 text-2xl font-semibold tracking-tight">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 mb-2 text-xl font-semibold">{children}</h3>
    ),
    p: ({ children }) => <p className="my-4 leading-7">{children}</p>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-bitcoin underline decoration-bitcoin/30 underline-offset-2 hover:decoration-bitcoin"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => <ul className="my-4 list-disc pl-6 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal pl-6 space-y-1">{children}</ol>,
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
    ...components,
  };
}
