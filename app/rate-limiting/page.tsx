import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payments',
  description: 'The anonymous rate-limiting demo moved: paid lookups now use credits (ARC credentials bought over Lightning).',
};

/**
 * The old demo here exercised the retired "Payment V1" dev issuer (ARC +
 * Cashu Blind Auth with free issuance). Production now uses credits; this
 * route stays so old links land somewhere useful.
 */
export default function RateLimitingMovedPage() {
  return (
    <div className="container-wide py-10">
      <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        The anonymous rate-limiting demo that lived here used a development issuer that has
        been retired. Paid lookups now use <strong>credits</strong>: an ARC credential bought
        once over Lightning and spent one frame at a time, unlinkable to the purchase.
      </p>
      <p className="mt-4">
        <Link href="/docs/sdk/payments" className="font-semibold text-bitcoin hover:underline">
          Read how payments work and how to add them to a wallet →
        </Link>
      </p>
    </div>
  );
}
