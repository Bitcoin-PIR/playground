'use client';

/**
 * Ambient declarations fed to Monaco via `addExtraLib` so the editor offers
 * completion + signature help for the injected SDK modules and stops marking
 * the snippet's imports as unresolved.
 *
 * These mirror the real vendor shapes closely enough for editing but are NOT
 * the source of truth — that's `vendor/pir-sdk-wasm/pir_sdk_wasm.d.ts` and
 * `vendor/bitcoinpir-web/*`. Members the snippets actually use are typed;
 * inspector-path getters that return loosely-typed JSON upstream are typed as
 * `any` to match.
 */
export const SDK_AMBIENT_DTS = `
declare module 'pir-sdk-wasm' {
  export interface WasmAttestVerification {
    readonly sevStatus: string;
    readonly serverStaticPub: Uint8Array;
    readonly serverStaticPubHex: string;
    readonly binarySha256Hex: string;
    readonly gitRev: string;
    readonly launchMeasurementHex: string;
    readonly hasVcekChain: boolean;
    /** Validate the AMD VCEK certificate chain against a pinned ARK fingerprint. */
    verifyVcekChain(expectedArkFingerprint: Uint8Array): void;
    free(): void;
  }
  export class WasmQueryResult {
    readonly entryCount: number;
    readonly totalBalance: bigint;
    readonly isWhale: boolean;
    /** UTXO at index as JSON: { txid, vout, amountSats }. */
    getEntry(index: number): any;
    toJson(): any;
    free(): void;
  }
  export class WasmDpfClient {
    constructor(server0Url: string, server1Url: string);
    connect(): Promise<void>;
    attest(serverIndex: number): Promise<WasmAttestVerification>;
    upgradeToSecureChannel(pub0: Uint8Array, pub1: Uint8Array): Promise<void>;
    fetchCatalog(): Promise<any>;
    /** Inspector path: returns the bin payloads needed by verifyMerkleBatch. */
    queryBatchRaw(scriptHashes: Uint8Array, dbId: number): Promise<WasmQueryResult[]>;
    queryBatch(scriptHashes: Uint8Array, dbId: number): Promise<any>;
    verifyMerkleBatch(resultsJson: any, dbId: number): Promise<boolean[]>;
    disconnect(): Promise<void>;
    free(): void;
  }
  export class WasmHarmonyClient {
    constructor(hintServerUrl: string, queryServerUrl: string);
    connect(): Promise<void>;
    attest(serverIndex: number): Promise<WasmAttestVerification>;
    upgradeToSecureChannel(hintPub: Uint8Array, queryPub: Uint8Array): Promise<void>;
    fetchCatalog(): Promise<any>;
    fetchHintsWithProgress(
      catalog: any,
      dbId: number,
      progress: (p: { done: number; total: number; phase: string }) => void,
    ): Promise<void>;
    saveHints(): any;
    queryBatchRaw(scriptHashes: Uint8Array, dbId: number): Promise<WasmQueryResult[]>;
    queryBatch(scriptHashes: Uint8Array, dbId: number): Promise<any>;
    verifyMerkleBatch(resultsJson: any, dbId: number): Promise<boolean[]>;
    disconnect(): Promise<void>;
    free(): void;
  }
  /** No-op in the playground (the runtime is already initialised). */
  export default function init(): Promise<unknown>;
}

declare module 'bitcoin-pir-web' {
  /** Mainnet address -> scriptPubKey hex (with opcodes), or null if undecodable. */
  export function addressToScriptPubKey(address: string): string | null;
  /** HASH160(scriptPubKey) — the 20-byte PIR query key. */
  export function scriptHash(scriptPubKey: Uint8Array): Uint8Array;
  export function hexToBytes(hex: string): Uint8Array;
  export function bytesToHex(bytes: Uint8Array): string;
}

declare module 'bitcoin-pir-web/attest-pin' {
  export interface ServerAttestPin {
    binarySha256Hex?: string;
    measurementHex?: string;
    [k: string]: unknown;
  }
  export const AMD_TURIN_ARK_FINGERPRINT: Uint8Array;
  export const PIR1_PIN: ServerAttestPin;
  export const PIR2_TIER3_PIN: ServerAttestPin;
}

declare module 'bitcoin-pir-web/onionpir_client' {
  export interface OnionUtxoEntry { txid: Uint8Array; vout: number; amount: number | bigint; }
  export interface OnionQueryResult { totalSats: bigint; entries: OnionUtxoEntry[]; isWhale?: boolean; }
  export class OnionPirWebClient {
    constructor(opts: { serverUrl: string });
    connect(): Promise<void>;
    queryBatch(scriptHashes: Uint8Array[]): Promise<(OnionQueryResult | null)[]>;
    verifyMerkleBatch(results: OnionQueryResult[]): Promise<boolean[]>;
    disconnect(): void;
  }
}
`;
