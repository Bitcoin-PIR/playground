'use client';

import { useState } from 'react';
import type { Backend } from '@/lib/explorer/runner';
import { runQuery } from '@/lib/explorer/runner';
import { diffProfiles, profile } from '@/lib/explorer/diff';
import type { ProfileDiff } from '@/lib/explorer/diff';

interface Props {
  backend: Backend;
  /** Address (or SPK hex) known to be present in the database. */
  defaultFound?: string;
  /** Address (or SPK hex) known to NOT be present. */
  defaultNotFound?: string;
}

/**
 * P2PKH address corresponding to the first entry of `web/src/example_spks.json`
 * (`76a91484407a2fe50de7b97ef1a80613b41d06af8fa38788ac`) — known to be
 * present in the live main-DB snapshot.
 */
const KNOWN_FOUND_ADDR = '1D4HSHPJxoPLqiBNFNarz34dcWPLvpiaeb';

/**
 * A "definitely not-found" baseline. `0014` is the OP_0 + 20-byte
 * push for a P2WPKH, and `1111…1111` is a 20-byte HASH160 that no
 * known wallet derives. Passed as a raw scriptPubKey hex so the runner
 * computes HASH160 once and probes that scripthash directly.
 */
const ZERO_SPK_HEX = '00141111111111111111111111111111111111111111';

/**
 * Workflow: run two queries (one known-found address + one known-NOT
 * found address) and prove the wire shape is indistinguishable.
 *
 * The visualisation is a diff table — every row is identical iff the
 * wire shape leaks nothing about the query outcome.
 */
export function FoundVsNotFoundDiff({
  backend,
  defaultFound = KNOWN_FOUND_ADDR,
  defaultNotFound = ZERO_SPK_HEX,
}: Props) {
  const [foundAddr, setFoundAddr] = useState(defaultFound);
  const [notFoundAddr, setNotFoundAddr] = useState(defaultNotFound);
  const [running, setRunning] = useState(false);
  const [diff, setDiff] = useState<ProfileDiff | null>(null);
  const [foundOutcome, setFoundOutcome] = useState<string | null>(null);
  const [notFoundOutcome, setNotFoundOutcome] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setDiff(null);
    setFoundOutcome(null);
    setNotFoundOutcome(null);
    try {
      const a = await runQuery({ backend, input: foundAddr });
      setFoundOutcome(a.outcome);
      const b = await runQuery({ backend, input: notFoundAddr });
      setNotFoundOutcome(b.outcome);
      setDiff(diffProfiles(profile(a.frames), profile(b.frames)));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-800">
        Found vs. not-found wire-shape diff
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs text-zinc-500">
          Run two queries — one known-found, one known-not-found — and check
          whether the wire shape (frame counts, byte counts, group counts)
          differs.{' '}
          <strong className="text-zinc-700 dark:text-zinc-300">
            The privacy guarantee is that they are identical.
          </strong>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs">
            <div className="mb-1 text-zinc-500">found address / SPK</div>
            <input
              type="text"
              value={foundAddr}
              onChange={(e) => setFoundAddr(e.target.value)}
              className="block w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-xs">
            <div className="mb-1 text-zinc-500">not-found address / SPK</div>
            <input
              type="text"
              value={notFoundAddr}
              onChange={(e) => setNotFoundAddr(e.target.value)}
              className="block w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="rounded-md bg-bitcoin px-3 py-1.5 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run both queries'}
        </button>

        {(foundOutcome || notFoundOutcome) && (
          <div className="rounded bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-900">
            <div>
              <span className="text-zinc-500">found query:</span>{' '}
              <span>{foundOutcome ?? '…'}</span>
            </div>
            <div>
              <span className="text-zinc-500">not-found query:</span>{' '}
              <span>{notFoundOutcome ?? '…'}</span>
            </div>
          </div>
        )}

        {diff && (
          <div>
            <div
              className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                diff.identical
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              }`}
            >
              {diff.identical
                ? 'WIRE SHAPE IDENTICAL'
                : 'WIRE SHAPE DIFFERS — possible leak'}
            </div>
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th className="px-2 py-1">metric</th>
                  <th className="px-2 py-1">found</th>
                  <th className="px-2 py-1">not-found</th>
                </tr>
              </thead>
              <tbody>
                {diff.rows.map((r, i) => (
                  <tr
                    key={i}
                    className={
                      r.same ? '' : 'bg-red-50 dark:bg-red-900/20'
                    }
                  >
                    <td className="px-2 py-0.5 text-zinc-700 dark:text-zinc-300">
                      {r.label}
                    </td>
                    <td className="px-2 py-0.5">{r.found}</td>
                    <td className="px-2 py-0.5">{r.notFound}</td>
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
