import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Run real PIR queries against live servers and get the SDK code for your wallet.',
};

export default function PlaygroundPage() {
  return (
    <div className="container-narrow py-12">
      <h1 className="text-3xl font-bold tracking-tight">SDK playground</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Paste a Bitcoin address, pick a backend, and we&apos;ll run a live query against the
        production server. The right panel shows the exact TypeScript code your wallet would
        write to do the same query.
      </p>

      <div className="mt-12 rounded-lg border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
        <p className="font-mono text-sm">[playground UI lands here — feat/playground]</p>
      </div>
    </div>
  );
}
