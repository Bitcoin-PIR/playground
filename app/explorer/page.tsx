import type { Metadata } from 'next';
import { ExplorerClient } from './ExplorerClient';

export const metadata: Metadata = {
  title: 'Wire explorer',
  description:
    'Inspect every WebSocket frame and verify the five privacy invariants hold on your traffic.',
};

export default function ExplorerPage() {
  return (
    <div className="container-wide py-10">
      <h1 className="text-3xl font-bold tracking-tight">Protocol & wire explorer</h1>
      <p className="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-400">
        Run a query and see every WebSocket frame the SDK sends and receives. The
        explorer monkey-patches <code className="font-mono text-xs">window.WebSocket</code>{' '}
        so it observes every frame the vendored DPF/HarmonyPIR WASM clients produce, then
        checks the captured traffic against the five privacy invariants documented in the
        main repo&apos;s CLAUDE.md.
      </p>

      <ExplorerClient />
    </div>
  );
}
