'use client';

import { useMemo } from 'react';
import { parseAddress, type ParsedAddress } from '@/lib/address';

const EXAMPLES: { label: string; address: string }[] = [
  // Satoshi block 9 (legacy P2PKH).
  { label: 'Block 9 (P2PKH)', address: '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX' },
  // Genesis block coinbase.
  { label: 'Genesis (P2PKH)', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
  // Pizza-day recipient P2SH-ish modern example: a well-known P2WPKH.
  { label: 'P2WPKH example', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
];

export function AddressInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const parsed: ParsedAddress | null = useMemo(() => {
    try {
      return parseAddress(value);
    } catch {
      return null;
    }
  }, [value]);

  const trimmed = value.trim();
  const invalid = trimmed.length > 0 && parsed === null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="address-input">
        Bitcoin address
      </label>
      <input
        id="address-input"
        type="text"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="bc1q… / 1… / 3…"
        className={`block w-full rounded-md border bg-white px-3 py-2 font-mono text-sm shadow-sm transition focus:outline-none focus:ring-2 dark:bg-zinc-900 ${
          invalid
            ? 'border-red-500 focus:ring-red-500/30'
            : 'border-zinc-300 focus:ring-bitcoin/30 dark:border-zinc-700'
        }`}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">Try:</span>
        {EXAMPLES.map((e) => (
          <button
            key={e.address}
            type="button"
            disabled={disabled}
            onClick={() => onChange(e.address)}
            className="rounded border border-zinc-300 px-2 py-0.5 font-mono text-[11px] text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            {e.label}
          </button>
        ))}
      </div>
      {parsed && (
        <dl className="rounded-md bg-zinc-50 px-3 py-2 text-xs font-mono dark:bg-zinc-900">
          <Row label="type" value={parsed.scriptType} />
          <Row label="scriptPubKey" value={parsed.scriptPubKeyHex} mono />
          <Row label="scripthash (HASH160)" value={parsed.scriptHashHex} mono />
        </dl>
      )}
      {invalid && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn’t decode that as a Bitcoin address. Supported: P2PKH, P2SH, P2WPKH, P2WSH, P2TR.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-zinc-500">{label}</dt>
      <dd className={`min-w-0 break-all ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
