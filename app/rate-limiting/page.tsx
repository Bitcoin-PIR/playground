import type { Metadata } from 'next';
import { RateLimitClient } from './RateLimitClient';

export const metadata: Metadata = {
  title: 'Rate limiting',
  description:
    'Anonymous rate-limiting credentials (ARC + Cashu Blind Auth) end-to-end: mint, obtain, present, verify — with quota, exhaustion, and replay rejection.',
};

export default function RateLimitingPage() {
  return (
    <div className="container-wide py-10">
      <h1 className="text-3xl font-bold tracking-tight">Anonymous rate limiting</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Two ways to rate-limit PIR queries without deanonymizing the user, end-to-end:{' '}
        <strong>mint → obtain → present → verify</strong>.{' '}
        <strong>ARC</strong> is a multi-show credential (one credential authorizes N
        unlinkable presentations, bounded by a range proof);{' '}
        <strong>Cashu Blind Auth</strong> is a pool of single-show tokens (BDHKE, one token
        per query). Watch the quota drain, then try a replay to see the gate reject it.
      </p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
        <p>
          The blinding/finalizing runs in WASM (the secrets never leave your browser); the
          issuer is the <strong>dev-issuer</strong> — a demo backend with{' '}
          <strong>free issuance</strong> (no payment) that also runs the verify gate, so no
          PIR database is needed. In production the same present frames go over WebSocket to
          the PIR server&apos;s identical credential gate, and issuance would be gated behind
          a Lightning-backed mint.
        </p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Default issuer is <code className="font-mono text-xs">https://issuer.bitcoinpir.org</code>.
          To run your own, build the main repo and start{' '}
          <code className="font-mono text-xs">cargo run -p dev-issuer</code>, then set the
          Issuer URL to <code className="font-mono text-xs">http://127.0.0.1:5601</code>{' '}
          (localhost is exempt from mixed-content blocking, so it works even here over HTTPS).
        </p>
      </div>

      <RateLimitClient />
    </div>
  );
}
