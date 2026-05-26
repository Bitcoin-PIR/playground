'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Backend } from '@/components/BackendSelector';
import { buildSnippet } from '@/lib/snippet';
import { runUserCode, type RunLogLine, type RunOutcome } from '@/lib/runner/run-user-code';
import { lintSafety } from '@/lib/runner/safety-lint';

// Monaco is client-only and heavy — load it lazily and never during the static
// export's prerender.
const CodeEditor = dynamic(() => import('./CodeEditor').then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center text-xs text-zinc-500">
      Loading editor…
    </div>
  ),
});

const LEVEL_CLASS: Record<RunLogLine['level'], string> = {
  log: 'text-zinc-200',
  info: 'text-sky-300',
  warn: 'text-amber-300',
  error: 'text-red-400',
};

export function EditableRunner({
  backend,
  address,
}: {
  backend: Backend;
  address: string;
}) {
  const generated = useMemo(() => buildSnippet(backend, address), [backend, address]);
  const [code, setCode] = useState(generated);
  const [dirty, setDirty] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<RunLogLine[]>([]);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-sync to the generated snippet when backend/address changes — but only
  // while the user hasn't edited, so we never silently clobber their work.
  useEffect(() => {
    if (!dirty) setCode(generated);
  }, [generated, dirty]);

  const warnings = useMemo(() => lintSafety(code, backend), [code, backend]);
  const stale = dirty && code !== generated;

  const onChange = useCallback((next: string) => {
    setCode(next);
    setDirty(true);
  }, []);

  const reset = useCallback(() => {
    setCode(generated);
    setDirty(false);
    setOutcome(null);
    setLogs([]);
  }, [generated]);

  const run = useCallback(async () => {
    setRunning(true);
    setOutcome(null);
    setLogs([]);
    const streamed: RunLogLine[] = [];
    const result = await runUserCode(code, (line) => {
      streamed.push(line);
      setLogs([...streamed]);
    });
    setOutcome(result);
    setRunning(false);
  }, [code]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  }, [code]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <span>
            TypeScript — edit &amp; run in your browser
            {dirty && <span className="ml-2 text-bitcoin">• edited</span>}
          </span>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={reset}
                className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
              >
                reset
              </button>
            )}
            <button
              type="button"
              onClick={copy}
              className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
            >
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
        </div>
        <CodeEditor value={code} onChange={onChange} onRun={run} />
      </div>

      {stale && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <span>Backend or address changed since you edited.</span>
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded border border-zinc-300 px-2 py-0.5 text-[11px] hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
          >
            reset to generated snippet
          </button>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="mb-1 font-semibold text-amber-800 dark:text-amber-300">
            ⚠ Privacy / soundness check ({warnings.length}) — warning only, never blocks running
          </div>
          <ul className="space-y-1 text-amber-800/90 dark:text-amber-200/90">
            {warnings.map((w) => (
              <li key={w.id}>
                <span className="font-medium">{w.title}:</span> {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md bg-bitcoin px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bitcoin-dark disabled:bg-zinc-400 disabled:dark:bg-zinc-700"
        >
          {running ? 'running…' : 'Run in browser'}
        </button>
        <span className="text-xs text-zinc-500">
          Transpiled &amp; executed entirely in your browser (⌘/Ctrl+Enter). The only network
          call is the PIR query itself.
        </span>
      </div>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <span>Output</span>
          {outcome && (
            <span className="font-mono text-[11px]">
              {outcome.error ? 'errored' : 'done'} in {outcome.elapsedMs.toFixed(0)} ms
            </span>
          )}
        </div>
        <div className="max-h-[320px] overflow-auto bg-zinc-950 px-3 py-2 font-mono text-xs leading-relaxed">
          {logs.length === 0 && !outcome && (
            <div className="text-zinc-500">
              No output yet. Press <span className="text-zinc-300">Run</span> to execute against
              the live servers.
            </div>
          )}
          {logs.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${LEVEL_CLASS[line.level]}`}>
              {line.text}
            </div>
          ))}
          {outcome?.error && (
            <div className="mt-2 whitespace-pre-wrap border-t border-zinc-800 pt-2 text-red-400">
              ✗ {outcome.error}
            </div>
          )}
          {outcome && !outcome.error && (
            <div className="mt-2 border-t border-zinc-800 pt-2 text-emerald-400">
              ✓ finished
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
