'use client';

import Link from 'next/link';

export function QuickStartCard() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="text-sm font-semibold">Add PIR to your wallet in ten minutes</h3>
      <ol className="mt-3 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>
          <span className="mr-2 font-mono text-bitcoin">1.</span>
          <code className="font-mono text-[12px]">npm install pir-sdk-wasm</code>
        </li>
        <li>
          <span className="mr-2 font-mono text-bitcoin">2.</span>
          Copy the snippet on the right into your wallet&apos;s sync path.
        </li>
        <li>
          <span className="mr-2 font-mono text-bitcoin">3.</span>
          Pin attestation values from{' '}
          <code className="font-mono text-[12px]">bitcoin-pir-web/attest-pin</code>{' '}
          and refuse to query if the chain or pins fail.
        </li>
      </ol>
      <div className="mt-3 flex items-center gap-3 text-xs">
        <Link href="/docs/quickstart" className="text-bitcoin hover:underline">
          full quickstart →
        </Link>
        <Link href="/docs/privacy/invariants" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          privacy invariants
        </Link>
      </div>
    </div>
  );
}
