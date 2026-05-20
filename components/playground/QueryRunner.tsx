'use client';

import { useCallback, useState } from 'react';
import { BackendSelector, type Backend } from '@/components/BackendSelector';
import { AddressInput } from './AddressInput';
import { ResultPanel } from './ResultPanel';
import { CodeSnippet } from './CodeSnippet';
import { QuickStartCard } from './QuickStartCard';
import { parseAddress } from '@/lib/address';
import { runQuery, type PlaygroundQueryResult } from '@/lib/playground-clients';
import { buildSnippet } from '@/lib/snippet';

export function QueryRunner() {
  const [backend, setBackend] = useState<Backend>('dpf');
  const [address, setAddress] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<PlaygroundQueryResult | null>(null);

  const parsed = parseAddress(address);
  const canRun = parsed !== null && !running;

  const onRun = useCallback(async () => {
    if (!parsed) return;
    setError(null);
    setResult(null);
    setRunning(true);
    setProgress('connecting…');
    try {
      // Surface a tiny progress message before the heavy lifting; the
      // WASM clients don't expose per-step progress yet.
      const tick = setInterval(() => {
        setProgress((p) =>
          p === 'connecting…' ? 'attesting + querying…' : p,
        );
      }, 1200);
      try {
        const r = await runQuery(backend, parsed.scriptHash, parsed.scriptPubKeyHex);
        setResult(r);
        setProgress(null);
      } finally {
        clearInterval(tick);
      }
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
      setProgress(null);
    } finally {
      setRunning(false);
    }
  }, [backend, parsed]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Backend
        </h2>
        <BackendSelector value={backend} onChange={setBackend} />
      </div>

      <AddressInput value={address} onChange={setAddress} disabled={running} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="rounded-md bg-bitcoin px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bitcoin-dark disabled:bg-zinc-400 disabled:dark:bg-zinc-700"
        >
          {running ? 'running…' : 'Run query'}
        </button>
        {progress && (
          <span className="text-xs text-zinc-500">{progress}</span>
        )}
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Result
          </h2>
          {result ? (
            <ResultPanel result={result} />
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No query run yet. Pick a backend, paste an address, hit{' '}
              <span className="font-mono">Run query</span>.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            What your wallet would write
          </h2>
          <CodeSnippet code={buildSnippet(backend, address)} />
          <QuickStartCard />
        </div>
      </div>
    </div>
  );
}
