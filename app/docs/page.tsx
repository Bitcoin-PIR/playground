import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API reference',
  description:
    'Integration guides, SDK reference, protocol spec, privacy guarantees, attestation.',
};

export default function DocsHome() {
  return (
    <div className="container-narrow py-12">
      <h1 className="text-3xl font-bold tracking-tight">API reference</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Everything a wallet developer needs to integrate Bitcoin PIR.
      </p>

      <div className="mt-12 rounded-lg border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
        <p className="font-mono text-sm">[docs land here — feat/docs]</p>
        <p className="mt-2 text-xs">
          MDX content goes under <code>content/docs/**/*.mdx</code>; route tree under{' '}
          <code>app/docs/**</code>.
        </p>
      </div>
    </div>
  );
}
