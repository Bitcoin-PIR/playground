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
  /** (credits) => presentation worth at least \`credits\`, or null (empty wallet). */
  export type CreditProvider = (credits: number) =>
    { kind: number; payload: Uint8Array; credits: number } | null;
  export class WasmDpfClient {
    constructor(server0Url: string, server1Url: string);
    connect(): Promise<void>;
    attest(serverIndex: number): Promise<WasmAttestVerification>;
    upgradeToSecureChannel(pub0: Uint8Array, pub1: Uint8Array): Promise<void>;
    /** After the sealed channel: 'not-enabled' | 'not-required' | 'required'. */
    enableCredits(serverIndex: number, provider: CreditProvider): Promise<string>;
    fetchCatalog(): Promise<any>;
    /** Query + per-bucket Merkle verification, all or nothing. */
    queryBatchVerified(scriptHashes: Uint8Array, dbId: number): Promise<WasmQueryResult[]>;
    queryBatch(scriptHashes: Uint8Array, dbId: number): Promise<any>;
    disconnect(): Promise<void>;
    free(): void;
  }
  export class WasmHarmonyClient {
    constructor(hintServerUrl: string, queryServerUrl: string);
    connect(): Promise<void>;
    attest(serverIndex: number): Promise<WasmAttestVerification>;
    upgradeToSecureChannel(hintPub: Uint8Array, queryPub: Uint8Array): Promise<void>;
    enableCredits(serverIndex: number, provider: CreditProvider): Promise<string>;
    fetchCatalog(): Promise<any>;
    fetchHintsWithProgress(catalog: any, dbId: number, progress: (p: any) => void): Promise<void>;
    saveHints(): any;
    /** Fetches hints on first use; query + Merkle verification, all or nothing. */
    queryBatchVerified(scriptHashes: Uint8Array, dbId: number): Promise<WasmQueryResult[]>;
    queryBatch(scriptHashes: Uint8Array, dbId: number): Promise<any>;
    disconnect(): Promise<void>;
    free(): void;
  }
  export class WasmOramClient {
    constructor(serverUrl: string);
    connect(): Promise<void>;
    attest(): Promise<WasmAttestVerification>;
    upgradeToSecureChannel(serverStaticPub: Uint8Array): Promise<void>;
    enableCredits(provider: CreditProvider): Promise<string>;
    fetchCatalog(): Promise<any>;
    disconnect(): Promise<void>;
    free(): void;
  }
  /** No-op in the playground (the runtime is already initialised). */
  export default function init(): Promise<unknown>;
}

declare module 'bitcoin-pir-web' {
  export interface UtxoEntry { txid: Uint8Array; vout: number; amount: number | bigint; }
  export interface QueryResult { totalSats: bigint; entries: UtxoEntry[]; isWhale?: boolean; }
  export interface ProductionProviderPin {
    endpoint: string;
    stableServerId: string;
    serverPin: { binarySha256Hex?: string; measurementHex?: string };
    operatorPubkey: Uint8Array;
    expectedArkFingerprint: Uint8Array | null;
  }
  export const PIR1_PROVIDER: ProductionProviderPin;
  export const PIR2_PROVIDER: ProductionProviderPin;
  /** The production Direct ORAM request shape (25 padded slots). */
  export const PRODUCTION_ORAM_BATCH_PLANNER: Readonly<Record<string, number>>;
  export const PRODUCTION_CASHIER_URL: string;
  export interface CreditEnablement { state: 'not-enabled' | 'not-required' | 'required' | 'error'; error?: string; }
  export class OramPirClientAdapter {
    constructor(config: {
      serverUrl: string;
      strictVerification?: boolean;
      expectedArkFingerprint?: Uint8Array | null;
      expectedServerPin?: unknown;
      expectedServerId?: string;
      pinnedOperatorPubkey?: Uint8Array;
      verifyOperatorIdentity?: boolean;
      databaseProofPins?: unknown[];
      batchPlanner?: Readonly<Record<string, number>>;
      creditProvider?: (credits: number) => unknown;
      onCredits?: (status: CreditEnablement) => void;
      [k: string]: unknown;
    });
    readonly attestation: { state: string; [k: string]: unknown };
    readonly operatorIdentity: { state: string; [k: string]: unknown };
    connect(): Promise<void>;
    getDatabaseProofStatus(dbId: number): { state: string } | undefined;
    queryBatch(scriptHashes: Uint8Array[], onProgress?: unknown, dbId?: number): Promise<(QueryResult | null)[]>;
    disconnect(): void;
  }
  /** Credits wallet (see /docs/sdk/payments). */
  export class IssuerClient { constructor(baseUrl: string); info(): Promise<any>; }
  export class CreditStore { constructor(); remainingCredits(now: number): number; }
  export class CreditWallet {
    constructor(store: CreditStore, arc: any, now?: () => number);
    remainingCredits(): number;
    present(credits: number): { kind: number; payload: Uint8Array; credits: number } | null;
  }
  export function purchaseCredential(...args: any[]): Promise<any>;
  export function cashuLightningRail(): any;
  export function sdkArcFactories(): { request: any; credential: any };
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
  export const PRODUCTION_ORAM_DB_PROOF_V2_PINS: unknown[];
}

declare module 'bitcoin-pir-web/onionpir_client' {
  export interface OnionUtxoEntry { txid: Uint8Array; vout: number; amount: number | bigint; }
  export interface OnionQueryResult { totalSats: bigint; entries: OnionUtxoEntry[]; isWhale?: boolean; }
  export class OnionPirWebClient {
    constructor(opts: {
      serverUrl: string;
      expectedServerPin?: unknown;
      expectedServerId?: string;
      pinnedOperatorPubkey?: Uint8Array;
      creditProvider?: (credits: number) => unknown;
      onCredits?: (status: { state: string; error?: string }) => void;
      [k: string]: unknown;
    });
    connect(): Promise<void>;
    queryBatch(scriptHashes: Uint8Array[]): Promise<(OnionQueryResult | null)[]>;
    verifyMerkleBatch(results: OnionQueryResult[]): Promise<boolean[]>;
    disconnect(): void;
  }
}
`;
