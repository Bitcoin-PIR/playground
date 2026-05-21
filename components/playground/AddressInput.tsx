'use client';

import { useMemo } from 'react';
import { parseAddress, type ParsedAddress } from '@/lib/address';

// Mainnet addresses spanning the four common script types plus a
// known-empty entry, all verified via mempool.space to be in the
// 1–16 UTXO range (well under the whale cutoff so they survive the
// PIR database build). The originals (Block 9 + Genesis + a random
// vanity P2WPKH) were all whales or unspendable by today's UTXO
// counts and demoed the same "found" case three different ways.
const EXAMPLES: { label: string; address: string }[] = [
  // Recipient of the very first BTC transaction (Satoshi → Hal
  // Finney, Jan 12 2009, block 170). ~4 UTXOs of tribute sends.
  { label: 'Hal Finney (P2PKH)', address: '1Q2TWHE3GMdB6BZKafqwxXtWAWgFt5Jvm3' },
  // The 10,000-BTC pizza recipient (Laszlo → Jeremy Sturdivant,
  // May 22 2010). Original 10k spent long ago; ~13 tribute UTXOs.
  { label: 'Pizza Day (P2PKH)', address: '17SkEw2md5avVNyYgj6RiXuQKNwkXaxFyQ' },
  // Bitcoin.org's P2SH-wrapped donation address.
  { label: 'Bitcoin.org (P2SH)', address: '3E8ociqZa9mZUSwGdSmAEMAoAxBK3FNDcd' },
  // Bitcoin.org's native-segwit donation address (per their site).
  { label: 'Bitcoin.org (P2WPKH)', address: 'bc1qp6ejw8ptj9l9pkscmlf8fhhkrrjeawgpyjvtq8' },
  // The canonical "first Taproot output" address — first funded on
  // BIP-341 activation day (Nov 14 2021, block 709635) and cited as
  // the canonical bc1p example in nearly every Taproot tutorial.
  { label: 'First Taproot (P2TR)', address: 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297' },
  // Locally-generated vanity P2WPKH (prefix reads "bc1qdem…"),
  // verified zero on-chain and zero mempool activity — demonstrates
  // the "verified absent" path.
  { label: 'Empty (not found)', address: 'bc1qdemwhwmucrly8hywzwk5p8p8gvuel6vp9ddprt' },
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
        placeholder="bc1q… / bc1p… / 1… / 3…"
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
