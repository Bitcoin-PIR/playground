'use client';

import type { PlaygroundQueryResult } from '@/lib/playground-clients';
import { AttestationBadge } from './AttestationBadge';
import { OperatorIdentityBadge } from './OperatorIdentityBadge';

export function ResultPanel({ result }: { result: PlaygroundQueryResult }) {
  const btc = (sats: bigint) =>
    `${Number(sats) / 1e8} BTC (${sats.toString()} sat)`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="UTXOs" value={result.utxos.length.toString()} />
        <Stat label="balance" value={result.utxos.length ? btc(result.totalSats) : '—'} />
        <Stat label="query" value={`${result.queryElapsedMs.toFixed(0)} ms`} />
        <Stat label="end-to-end" value={`${result.totalElapsedMs.toFixed(0)} ms`} />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Attestation</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {result.attestation.map((a) => (
            <AttestationBadge key={a.url + a.label} att={a} />
          ))}
        </div>
      </div>

      {result.operatorIdentity.some(
        (o) => o.identity.state === 'verified' || o.identity.state === 'unverified',
      ) && (
        <div>
          <div className="mb-2 text-sm font-medium">Operator identity</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.operatorIdentity.map((o) => (
              <OperatorIdentityBadge key={o.label} op={o} />
            ))}
          </div>
        </div>
      )}

      {result.isWhale && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          This address has so many UTXOs that the build pipeline excluded it
          from the indexed database (“whale” path). Use a public block explorer
          for whales, or run your own indexer.
        </div>
      )}

      {!result.merkleVerified && (
        <div className="rounded-md border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
          Per-bucket Merkle verification FAILED. Do not trust this result.
        </div>
      )}

      {result.notes.length > 0 && (
        <ul className="space-y-1 text-xs text-zinc-500">
          {result.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-medium">
            UTXOs ({result.utxos.length})
          </h3>
          {result.utxos.length === 0 && (
            <span className="text-xs text-zinc-500">
              No UTXOs returned — the address is empty (or absent from the snapshot).
            </span>
          )}
        </div>
        {result.utxos.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">TXID:vout</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {result.utxos.map((u) => (
                  <tr
                    key={`${u.txidHex}:${u.vout}`}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      <a
                        href={`https://mempool.space/tx/${u.txidHex}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-bitcoin"
                      >
                        {u.txidHex}
                      </a>
                      <span className="text-zinc-500">:{u.vout}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Number(u.amountSats) / 1e8}{' '}
                      <span className="text-xs text-zinc-500">BTC</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm">{value}</div>
    </div>
  );
}
