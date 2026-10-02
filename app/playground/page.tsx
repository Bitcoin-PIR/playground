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
          <code className="font-mono text-xs">wss://bitcoin-pir-weikeng-laptop.chenweikeng.com</code>,
          attest the server binaries, check each operator-signed identity, run the query,
          and verify the result with per-bucket Merkle proofs. Neither server has a TEE:
          pir2 now runs on a MacBook. The right panel is the equivalent TypeScript your
          wallet would write — editable and runnable right here, transpiled and executed
          entirely in your browser.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <strong>DPF-PIR</strong> is free while the servers have room: paid lookups go first,
          and a busy server says so. HarmonyPIR and OnionPIR cost{' '}
          <a href="/docs/sdk/payments" className="underline">credits</a>, and the playground
          has no wallet yet, so those stop at the first paid frame and show why.{' '}
          <strong>ORAM TEE</strong> is paused until a new TEE host serves it.
        </p>
      </div>

      <div className="mt-10">
        <QueryRunner />
      </div>
    </div>
  );
}
