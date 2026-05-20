/**
 * Address -> scripthash derivation for the playground.
 *
 * The PIR system keys queries on HASH160(scriptPubKey) (20 bytes) — the same
 * shape `WasmDpfClient.queryBatchRaw` / `WasmHarmonyClient.queryBatch` /
 * `OnionPirWebClient.queryBatch` consume. We accept any mainnet address
 * (bech32 / bech32m / base58check), reuse the vendor address parser, and
 * fall through to `null` on anything we can't decode.
 */

import {
  addressToScriptPubKey,
  bytesToHex,
  hexToBytes,
  scriptHash as hash160,
} from '@vendor/web/hash';

export interface ParsedAddress {
  /** Input the user pasted, trimmed. */
  address: string;
  /** scriptPubKey hex (with opcodes, e.g. "0014<20B hash>"). */
  scriptPubKeyHex: string;
  /** 20-byte HASH160(scriptPubKey) — the PIR query key. */
  scriptHash: Uint8Array;
  /** Hex form of `scriptHash`, for display. */
  scriptHashHex: string;
  /** P2PKH / P2WPKH / P2SH / P2WSH / P2TR. */
  scriptType: ScriptType;
}

export type ScriptType =
  | 'P2PKH'
  | 'P2SH'
  | 'P2WPKH'
  | 'P2WSH'
  | 'P2TR'
  | 'unknown';

function classifyScript(spkHex: string): ScriptType {
  if (spkHex.startsWith('76a914') && spkHex.endsWith('88ac') && spkHex.length === 50) return 'P2PKH';
  if (spkHex.startsWith('a914') && spkHex.endsWith('87') && spkHex.length === 46) return 'P2SH';
  if (spkHex.startsWith('0014') && spkHex.length === 44) return 'P2WPKH';
  if (spkHex.startsWith('0020') && spkHex.length === 68) return 'P2WSH';
  if (spkHex.startsWith('5120') && spkHex.length === 68) return 'P2TR';
  return 'unknown';
}

/** Parse a Bitcoin address; return `null` if we can't decode it. */
export function parseAddress(input: string): ParsedAddress | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const spkHex = addressToScriptPubKey(trimmed);
  if (!spkHex) return null;
  const spk = hexToBytes(spkHex);
  const sh = hash160(spk);
  return {
    address: trimmed,
    scriptPubKeyHex: spkHex,
    scriptHash: sh,
    scriptHashHex: bytesToHex(sh),
    scriptType: classifyScript(spkHex),
  };
}
