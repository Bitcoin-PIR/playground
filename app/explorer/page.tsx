import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wire explorer',
  description:
    'Inspect every WebSocket frame and verify the four privacy invariants hold on your traffic.',
};

export default function ExplorerPage() {
  return (
    <div className="container-wide py-12">
      <h1 className="text-3xl font-bold tracking-tight">Protocol & wire explorer</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Run a query and see every frame the SDK sends and receives. Verify in real time that
        K-padding, CHUNK round-presence, INDEX Merkle item counts, and HarmonyPIR per-group
        request counts all match the privacy invariants documented in CLAUDE.md.
      </p>

      <div className="mt-12 rounded-lg border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
        <p className="font-mono text-sm">[explorer UI lands here — feat/explorer]</p>
      </div>
    </div>
  );
}
