import type { Metadata } from 'next';
import { QueryRunner } from '@/components/playground/QueryRunner';

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Run real PIR queries against the live Bitcoin PIR servers and get the SDK code your wallet would use.',
};

export default function PlaygroundPage() {
  return (
    <div className="container-wide py-10">
      <div className="mx-auto max-w-3xl space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">SDK playground</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Paste a Bitcoin address, pick a backend, hit{' '}
          <span className="font-mono">Run query</span>. We open a real WebSocket
          to{' '}
          <code className="font-mono text-xs">wss://weikeng1.bitcoinpir.org</code>{' '}
          /{' '}
          <code className="font-mono text-xs">wss://weikeng2.bitcoinpir.org</code>,
          attest the server binaries, run the query, and verify the per-bucket
          Merkle proofs. The right panel is the equivalent TypeScript your wallet
          would write — editable and runnable right here, transpiled and executed
          entirely in your browser.
        </p>
      </div>

      <div className="mt-10">
        <QueryRunner />
      </div>
    </div>
  );
}
