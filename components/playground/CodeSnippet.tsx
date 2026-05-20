'use client';

import { useState } from 'react';

export function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        <span>TypeScript — drop into your wallet</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // ignore — clipboard blocked
            }
          }}
          className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="max-h-[480px] overflow-auto px-3 py-2 text-xs font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
