/* tslint:disable */
/* eslint-disable */

/**
 * PRP backend constant for `FastPRP`. Requires the `fastprp` cargo
 * feature on the enclosing build.
 */
export function PRP_FASTPRP(): number;

/**
 * PRP backend constant for the reference `HMR12` implementation.
 * Always available.
 */
export function PRP_HMR12(): number;

/**
 * JS-visible result of a `WasmDpfClient.announce()` (or
 * `WasmHarmonyClient.announce()`) call.
 *
 * Carries the parsed operator-signed bundle:
 * - `IdentityCert` (Tier 1): operator's offline Ed25519 key endorses
 *   the server's identity_pubkey for a given server_id + validity
 *   window.
 * - `ChannelManifest` (Tier 2): server's per-boot Ed25519 key signs
 *   the current channel_pub + build metadata.
 *
 * `chainVerified` tells you whether the two layers cross-check
 * (manifest signature + identity_pubkey + server_id agreement).
 * Pinning the operator pubkey is a separate, caller-driven step:
 * compare `operatorPubkeyHex` against your pinned value, then call
 * the IdentityCert's verify yourself if you want defense-in-depth on
 * top of `chainVerified` — but `chainVerified` already runs the
 * manifest signature check internally.
 */
export class WasmAnnounceVerification {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Bind the bundle to the encrypted session: verify that the
     * manifest's `channelPub` equals the X25519 key the channel
     * actually handshook against. Pass the *attested* key — i.e.
     * `attestVerification.serverStaticPub`, which the SEV-SNP report /
     * VCEK chain already vouches for. Throws on mismatch (the bundle
     * describes a different channel than the live session) or on a
     * non-32-byte argument. Mirrors the Rust
     * `AnnounceVerification::check_channel_binding` so web and native
     * share one implementation and error message.
     */
    checkChannelBinding(expected_channel_pub: Uint8Array): void;
    /**
     * Replay / staleness guard on `manifest.issued_at`. Throws if the
     * bundle is older than `maxAgeSeconds` before `nowUnixSeconds`
     * (stale) or more than 300s after it (future-dated). NOTE:
     * `issued_at` is the server's boot time, so pick `maxAgeSeconds`
     * generously (≥ expected uptime); pass `0n` to skip the staleness
     * arm, or `nowUnixSeconds === 0n` to skip entirely. Mirrors the Rust
     * `AnnounceVerification::check_freshness`.
     */
    checkFreshness(now_unix_seconds: bigint, max_age_seconds: bigint): void;
    /**
     * Verify the bundle against a pinned operator pubkey: operator
     * pubkey match + the cert's operator **signature** (`cert.verify()`)
     * + validity window (skipped when `nowUnixSeconds == 0`) + the
     * in-bundle chain check. Throws on any failure or a non-32-byte
     * argument. A bare `operatorPubkeyHex` string-compare would miss
     * the signature check, so use this. Mirrors the Rust
     * `AnnounceVerification::check_pinned_operator`.
     */
    checkPinnedOperator(pinned_operator_pubkey: Uint8Array, now_unix_seconds: bigint): void;
    /**
     * Hex-encoded binary SHA-256 the manifest claims (self-reported,
     * trustworthy iff the chain check passed).
     */
    readonly binarySha256Hex: string;
    /**
     * Diagnostic string describing why `chainVerified` is false.
     * Empty when verified.
     */
    readonly chainError: string;
    /**
     * Whether the in-bundle chain check passed: manifest signature
     * valid against `identityPubkey`, and `cert.server_id` ==
     * `manifest.server_id`, and `cert.identity_pubkey` ==
     * `manifest.identity_pubkey`. Does NOT include cert-vs-pinned-
     * operator verification (caller-driven).
     */
    readonly chainVerified: boolean;
    /**
     * X25519 channel pubkey the manifest endorses. Cross-check
     * against the value you'll handshake with (e.g.
     * `attestVerification.serverStaticPub`). Returns the raw 32 bytes.
     */
    readonly channelPub: Uint8Array;
    /**
     * Same data as [`Self::channel_pub`] but hex-encoded for display.
     */
    readonly channelPubHex: string;
    /**
     * Server-self-reported git rev (string).
     */
    readonly gitRev: string;
    /**
     * Hex-encoded identity pubkey the operator endorsed for this
     * server. The Tier-2 manifest signature chains back to this key.
     */
    readonly identityPubkeyHex: string;
    /**
     * Manifest's `issued_at` timestamp (unix-seconds). Use this to
     * apply a freshness policy if you want one.
     */
    readonly issuedAt: bigint;
    /**
     * Hex-encoded operator pubkey (the Tier-1 signer). Compare this
     * against the value the operator published out-of-band (e.g. via
     * Nostr) before trusting any of the bundle's fields.
     */
    readonly operatorPubkeyHex: string;
    /**
     * Server identifier the cert was endorsed for (e.g. "pir1").
     */
    readonly serverId: string;
    /**
     * Cert validity lower bound (unix-seconds). 0 = no lower bound.
     */
    readonly validFrom: bigint;
    /**
     * Cert validity upper bound (unix-seconds). 0 = indefinite.
     */
    readonly validUntil: bigint;
}

/**
 * JavaScript view of [`ArcCredentialState`].
 */
export class WasmArcCredential {
    free(): void;
    [Symbol.dispose](): void;
    epoch(): number;
    /**
     * `credential` from [`WasmArcCredentialRequest::finalize`], the epoch
     * and presentation limit the issuer named, and the persisted
     * `next_nonce` (0 for a fresh credential).
     */
    constructor(credential: Uint8Array, epoch: number, presentation_limit: number, next_nonce: number);
    /**
     * Persist this after every [`Self::present`], before sending the payload.
     */
    nextNonce(): number;
    /**
     * A `REQ_CREDIT_PRESENT` kind-2 payload of `count` presentations,
     * advancing the nonce counter. Fails without consuming anything when
     * fewer than `count` remain.
     */
    present(count: number): Uint8Array;
    presentationLimit(): number;
    /**
     * Presentations (credits) left.
     */
    remaining(): number;
}

/**
 * JavaScript view of [`ArcRequestState`].
 */
export class WasmArcCredentialRequest {
    free(): void;
    [Symbol.dispose](): void;
    epoch(): number;
    /**
     * Finish with the issuer's answer (`response_hex` decoded, and the
     * `issuer_public_key_hex` it named): verifies the issuance proof and
     * returns the credential bytes to persist.
     */
    finalize(issuer_public_key_hex: string, response: Uint8Array): Uint8Array;
    /**
     * Restore a request persisted before paying.
     */
    static fromBytes(epoch: number, secrets: Uint8Array, request: Uint8Array): WasmArcCredentialRequest;
    /**
     * A fresh request for `epoch` (the issuer's current epoch from
     * `GET /v2/info`).
     */
    constructor(epoch: number);
    /**
     * Bytes to send as `request_hex` in `POST /v2/credentials`.
     */
    requestBytes(): Uint8Array;
    /**
     * Secrets to persist next to the request bytes.
     */
    secretsBytes(): Uint8Array;
}

/**
 * Lock-free atomic metrics recorder exposed to JavaScript.
 *
 * Wraps `Arc<pir_sdk::AtomicMetrics>`. The `Arc` is cloned once per
 * client install, so counters are shared between JS (via this
 * handle's `snapshot()`) and every client that has the recorder
 * installed via `setMetricsRecorder`. Dropping the JS handle does
 * *not* detach the recorder from installed clients — reinstall or
 * call `clearMetricsRecorder()` on the client if you want the
 * counters to stop.
 */
export class WasmAtomicMetrics {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Construct a fresh recorder with every counter at zero.
     */
    constructor();
    /**
     * Take a snapshot of every counter at the current instant.
     *
     * Returns a plain JS object with sixteen `bigint` fields:
     *
     * ```text
     * {
     *   queriesStarted:               bigint,
     *   queriesCompleted:             bigint,
     *   queryErrors:                  bigint,
     *   bytesSent:                    bigint,
     *   bytesReceived:                bigint,
     *   framesSent:                   bigint,
     *   framesReceived:               bigint,
     *   connects:                     bigint,
     *   disconnects:                  bigint,
     *   totalQueryLatencyMicros:      bigint,  // sum of every observed query duration
     *   minQueryLatencyMicros:        bigint,  // u64::MAX before first completion
     *   maxQueryLatencyMicros:        bigint,  // 0 before first completion
     *   roundtripsObserved:           bigint,  // count of successful send+recv pairs
     *   totalRoundtripLatencyMicros:  bigint,  // sum of every observed roundtrip duration
     *   minRoundtripLatencyMicros:    bigint,  // u64::MAX before first roundtrip
     *   maxRoundtripLatencyMicros:    bigint,  // 0 before first roundtrip
     * }
     * ```
     *
     * Individual counters are atomic, but the snapshot as a whole is
     * NOT — two counters may be observed at slightly different
     * instants. See [`pir_sdk::AtomicMetrics::snapshot`] for the
     * consistency caveat.
     *
     * Latency-snapshot semantics (apply to both the per-query and
     * per-roundtrip families):
     * - `total*LatencyMicros` and `max*LatencyMicros` are 0 when no
     *   measurements have been recorded.
     * - `min*LatencyMicros` is `0xFFFF_FFFF_FFFF_FFFFn` (the BigInt
     *   form of `u64::MAX`) when no measurements have been recorded —
     *   callers should normalize via
     *   `snap.minQueryLatencyMicros === 0xFFFF_FFFF_FFFF_FFFFn ? 0n : snap.minQueryLatencyMicros`
     *   if a 0-when-empty value is preferable.
     *
     * `framesSent - roundtripsObserved` is the number of sends that
     * succeeded but whose matching response failed (transient-network
     * signal — see [`pir_sdk::PirMetrics::on_roundtrip_end`]).
     */
    snapshot(): any;
}

/**
 * JS-visible result of a `WasmDpfClient.attest()` (or
 * `WasmHarmonyClient.attest()`) call.
 *
 * Carries the server's self-reported binary hash + git rev + per-DB
 * manifest roots + V2 channel pubkey, plus the SEV-SNP report binding
 * status. The raw `sevSnpReport` bytes are also exposed so a future
 * browser-side AMD VCEK chain verifier (Slice D) can authenticate the
 * signature without re-fetching the report.
 *
 * Caller workflow:
 * 1. `await client.attest(serverIndex)` → this object.
 * 2. Read `sevStatus` — if `"reportDataMatch"`, the server's
 *    self-reported state is internally consistent with the chip-
 *    signed REPORT_DATA. Anything else means "do not trust the
 *    self-reported fields".
 * 3. (Slice D) Verify `sevSnpReport` against AMD's VCEK chain to
 *    prove the report itself is signed by real silicon.
 * 4. `await client.upgradeToSecureChannel(attest0.serverStaticPub,
 *    attest1.serverStaticPub)` — wraps both connections with the
 *    AEAD frame layer.
 */
export class WasmAttestVerification {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Highest-level SEV-SNP check: runs `verifyVcekChain`'s four
     * steps AND the policy assertions described below — in a single
     * call. On success, the report is fully trustworthy
     * (signature-anchored AND content-acceptable).
     *
     * `expectedArkFingerprint`: same as `verifyVcekChain`. Pass the
     * `AMD_TURIN_ARK_FINGERPRINT` constant from `attest-pin.ts` for
     * production.
     *
     * `policy` is a `WasmPolicyRequirements` (constructed via its
     * JS-visible constructor + setters). Defaults to the strictest
     * production policy: VMPL 0, no debug, no migration, TCB
     * monotonic. Override individual fields for tests / non-strict
     * deployments.
     *
     * Throws a single-line JsError on the FIRST failing step (chain
     * → report sig → policy). Use `verifyVcekChain` directly if you
     * want to surface the chain / sig failure separately from a
     * policy failure.
     */
    verifyFull(expected_ark_fingerprint: Uint8Array | null | undefined, policy: WasmPolicyRequirements): void;
    /**
     * One-shot AMD VCEK chain validation. Verifies:
     *   1. The ARK PEM's SHA-256 fingerprint matches
     *      `expectedArkFingerprint` (a 32-byte operator-pinned value
     *      — typically baked into the web bundle at build time so a
     *      malicious server can't substitute a forged root).
     *   2. ARK is self-signed; ARK signs ASK (RSA-PSS-SHA384).
     *   3. ASK signs the VCEK (RSA-PSS-SHA384).
     *   4. The SEV-SNP report's ECDSA-P384-SHA384 signature
     *      verifies against the VCEK's pubkey.
     *
     * On success returns nothing (resolves the Promise). On failure
     * throws a `JsError` whose message is a single-line diagnostic
     * from `pir_attest_verify::VerifyError`.
     *
     * `expectedArkFingerprint` MUST be exactly 32 bytes (SHA-256 of
     * the ARK's DER-encoded certificate). Pass `null` to skip the
     * pinning check (NOT recommended for production — without a
     * pinned root, a malicious server could supply a self-signed
     * "ARK" that doesn't actually belong to AMD).
     */
    verifyVcekChain(expected_ark_fingerprint?: Uint8Array | null): void;
    /**
     * Raw PEM bytes of the AMD ARK (Root Key) cert. Empty when not
     * bundled by the server.
     */
    readonly arkPem: Uint8Array;
    /**
     * Raw PEM bytes of the AMD ASK (SEV Signing Key) cert. Empty
     * when not bundled.
     */
    readonly askPem: Uint8Array;
    /**
     * SHA-256 of the running `unified_server` binary (server-side
     * self-report). Hex-encoded. Trusted only if `sevStatus` is
     * `"reportDataMatch"`.
     */
    readonly binarySha256Hex: string;
    /**
     * Hex-encoded REPORT_DATA preimage hash the client recomputed
     * locally. For comparison against the SEV report's REPORT_DATA[..32]
     * when manually inspecting an attestation.
     */
    readonly expectedReportDataHashHex: string;
    /**
     * Git commit baked into the running server binary. May be
     * suffixed with `-dirty` or be the literal `"unknown"`.
     */
    readonly gitRev: string;
    /**
     * True when all three cert PEMs are non-empty. Cheap pre-check
     * before calling `verifyVcekChain` — saves a WASM round-trip
     * when the server hasn't loaded a chain.
     */
    readonly hasVcekChain: boolean;
    /**
     * Hex-encoded launch MEASUREMENT — the 48-byte hash that AMD's
     * PSP signs into every SEV-SNP report, covering OVMF + the loaded
     * UKI bytes (kernel + initramfs + cmdline). For Tier 3 deployments
     * this is the operator-published value that pins the running
     * software stack: any change to the binary inside the initramfs
     * flips the MEASUREMENT, so a verifier comparing against a pinned
     * value can detect substitution.
     *
     * Returns the empty string when the server is not on a SEV-SNP
     * host (i.e. `sev_snp_report` is empty) — there's no MEASUREMENT
     * to extract from a non-existent report.
     *
     * Offset 0x90, length 48 within the SEV-SNP attestation report
     * (matches `bpir-admin attest`'s `MEASUREMENT_OFFSET` constant).
     */
    readonly launchMeasurementHex: string;
    /**
     * Per-DB manifest roots in db_id order. Each entry is a 64-char
     * hex string. The all-zero hash means that DB has no
     * `MANIFEST.toml` (legacy / un-verified state).
     */
    readonly manifestRootsHex: Array<any>;
    /**
     * 32-byte client nonce sent in REQ_ATTEST. Hex-encoded.
     */
    readonly nonceHex: string;
    /**
     * X25519 public key the server uses for the encrypted channel.
     * Returns the raw 32 bytes — pass directly to
     * [`WasmDpfClient::upgrade_to_secure_channel`]. All-zero if the
     * server doesn't yet have a channel key.
     */
    readonly serverStaticPub: Uint8Array;
    /**
     * Same data as [`Self::server_static_pub`] but hex-encoded (for
     * display / logging / cross-check against operator-published
     * values).
     */
    readonly serverStaticPubHex: string;
    /**
     * Raw signed SEV-SNP attestation report bytes (~1184 for v5).
     * Empty if the server isn't on a SEV-SNP host. Slice D's AMD VCEK
     * chain verifier consumes this directly.
     */
    readonly sevSnpReport: Uint8Array;
    /**
     * SEV-SNP REPORT_DATA binding status as a string. One of:
     * `"noSevHost"`, `"reportDataMatch"`, `"reportDataMismatch"`,
     * `"malformedReport"`. Use this to decide whether the
     * self-reported fields below are trustworthy.
     */
    readonly sevStatus: string;
    /**
     * Raw PEM bytes of the per-chip VCEK cert. Empty when not
     * bundled.
     */
    readonly vcekPem: Uint8Array;
}

/**
 * Opaque handle over a parsed tree-tops blob. Owns the parsed data so JS
 * can pass it to multiple `verifyBucketMerkleItem` calls without reparsing.
 *
 * Treat as immutable after construction.
 */
export class WasmBucketMerkleTreeTops {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * `cache_from_level` for the tree at `group_idx`. This is the number of
     * bottom-up sibling-query rounds the client must run before hitting the
     * cached top. Returns `None`-equivalent `u32::MAX` on out-of-range so the
     * JS caller can surface it as a verification failure.
     */
    cacheFromLevel(group_idx: number): number;
    /**
     * Parse a raw tree-tops blob (the payload *after* the `RESP_*` variant
     * byte on the wire — see `REQ_BUCKET_MERKLE_TREE_TOPS` = 0x34).
     *
     * Returns an error string on malformed input.
     */
    static fromBytes(data: Uint8Array): WasmBucketMerkleTreeTops;
    /**
     * Published per-group root (the last cached level's only entry). Empty
     * `Uint8Array` on out-of-range or if the tree-top has no levels.
     */
    root(group_idx: number): Uint8Array;
    /**
     * Total number of parsed trees (should equal `K + K_CHUNK` — the server
     * emits INDEX trees `[0..K)` followed by CHUNK trees `[K..K+K_CHUNK)`).
     */
    readonly treeCount: number;
}

/**
 * WASM wrapper for DatabaseCatalog.
 */
export class WasmDatabaseCatalog {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Create a catalog from JSON.
     *
     * Expected format:
     * ```json
     * {
     *   "databases": [
     *     {
     *       "dbId": 0,
     *       "dbType": 0,  // 0 = full, 1 = delta
     *       "name": "main",
     *       "baseHeight": 0,
     *       "height": 900000,
     *       "indexBins": 750000,
     *       "chunkBins": 1500000,
     *       "indexK": 75,
     *       "chunkK": 80,
     *       "tagSeed": "0x123456789abcdef0"
     *     }
     *   ]
     * }
     * ```
     */
    static fromJson(json: any): WasmDatabaseCatalog;
    /**
     * Get database info (by slot index in the catalog's array) as JSON.
     *
     * Pre-existing, positional — use [`getEntry`](Self::get_entry) if
     * you want to look up by `db_id` instead.
     */
    getDatabase(index: number): any;
    /**
     * Get a database's full info by `db_id`, returning the same JSON
     * shape as [`toJson`]'s `databases[i]` entry. Returns `null` if
     * no database in the catalog carries that ID.
     *
     * Complements [`getDatabase`], which is positional — callers who
     * only know the `db_id` (e.g. from a `SyncStep`) should reach
     * here instead of scanning `getDatabase(i)` for the right index.
     */
    getEntry(db_id: number): any;
    /**
     * Does the database with `db_id` publish per-bucket bin Merkle
     * commitments? `false` if the database is absent or carries no
     * Merkle section.
     *
     * The JS-side callers check this before enabling proof-backed queries;
     * the native atomic verifier performs the same check internally. The
     * flag is also useful for UI surfaces that show a "verified" badge only
     * when verification actually ran.
     */
    hasBucketMerkle(db_id: number): boolean;
    /**
     * Create an empty catalog.
     */
    constructor();
    /**
     * Convert to JSON.
     */
    toJson(): any;
    /**
     * Number of databases in the catalog.
     */
    readonly count: number;
    /**
     * Get latest tip height.
     */
    readonly latestTip: number | undefined;
}

/**
 * JS-visible summary of a verified attested-builder database proof.
 *
 * The Rust side has already checked the proof bundle against the database
 * catalog and policy before constructing this object. Hex values are display
 * oriented: block hashes and MuHash use Bitcoin Core display order; Merkle
 * roots and SHA-256 values are raw hex.
 */
export class WasmDatabaseProof {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Convert to a plain JS object for UI state and callbacks.
     */
    toJson(): any;
    readonly blockHashHex: string;
    readonly bucketSuperRootHex: string;
    readonly buildKind: string;
    readonly builderBinarySha256Hex: string;
    readonly builderGitCommit: string;
    readonly dbId: number;
    readonly fromBlockHashHex: string;
    readonly fromHeight: number;
    readonly height: number;
    readonly manifestRootHex: string;
    readonly muhashHex: string;
    readonly networkMagicHex: string;
    readonly onionChunkBinsPerTable: number | undefined;
    readonly onionEntrySize: number;
    readonly onionIndexBinsPerTable: number | undefined;
    readonly onionIndexSlotSize: number | undefined;
    readonly onionIndexSlotsPerBin: number | undefined;
    readonly onionSuperRootHex: string;
    readonly onionTotalPackedEntries: number | undefined;
    readonly paramsHashHex: string;
    readonly proofVersion: number;
}

/**
 * Two-server DPF-PIR client exposed to JavaScript.
 *
 * On the browser this is the recommended backend: stateless per query,
 * no FHE keys to register, and the fastest query round-trip of the
 * three backends. Construct with two `ws://` / `wss://` URLs, `connect`,
 * then call `sync` / `queryBatch`.
 *
 * ```javascript
 * import init, { WasmDpfClient } from 'pir-sdk-wasm';
 * await init();
 * const client = new WasmDpfClient('wss://pir1...', 'wss://pir2...');
 * await client.connect();
 * const res = await client.sync(scriptHashesU8, null);
 * ```
 */
export class WasmDpfClient {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Send REQ_ANNOUNCE to one of the connected servers and return a
     * [`WasmAnnounceVerification`] with the parsed operator-signed
     * identity bundle.
     *
     * Errors with the server's RESP_ERROR text ("announce not
     * configured") if the server doesn't have an identity key + cert
     * installed. That's a soft state — attest / handshake / queries
     * still work as normal.
     */
    announce(server_index: number): Promise<WasmAnnounceVerification>;
    /**
     * Send REQ_ATTEST to one of the connected servers and return a
     * [`WasmAttestVerification`] handle covering the response.
     *
     * `serverIndex` selects 0 (first URL) or 1 (second URL). Internally
     * the 32-byte nonce is *bound* to the X25519 handshake ephemeral
     * the client will use in the subsequent `upgradeToSecureChannel`:
     *
     * ```text
     * eph_seed       = OsRng()                                  (cached per-server)
     * client_eph_pub = X25519(eph_seed)
     * random_32      = OsRng()
     * nonce          = sha256("BPIR-ATTEST-NONCE-V1" || client_eph_pub || random_32)
     * ```
     *
     * Caching the `eph_seed` here lets `upgradeToSecureChannel` reuse
     * the same pubkey the report committed to, so the chip-signed
     * REPORT_DATA covers *this* handshake — not a stale or replayed
     * one. The `eph_seed` is never exposed to JS.
     *
     * Calling `attest(serverIndex)` twice for the same server rotates
     * the cached seed (the prior eph is dropped). Callers should call
     * `attest` for *both* servers before `upgradeToSecureChannel`.
     */
    attest(server_index: number): Promise<WasmAttestVerification>;
    /**
     * Uninstall the currently-registered metrics recorder. Subsequent
     * events are silenced on this client — any previously-shared
     * [`WasmAtomicMetrics`] handle held by JS continues to reflect
     * the last observed state and can still be installed on other
     * clients.
     */
    clearMetricsRecorder(): void;
    /**
     * Open WebSocket connections to both servers and run the PIR
     * handshake. Idempotent — calling twice is safe (the second call
     * returns early via `PirClient::is_connected`).
     *
     * Rejects on malformed URL, CORS violation, or server refusal.
     */
    connect(): Promise<void>;
    /**
     * Connect one provider without selecting or dialing its peer.
     */
    connectServer(server_index: number): Promise<void>;
    /**
     * Close both WebSocket connections. After this the client returns
     * `isConnected === false` and `connect` must be called before the
     * next query.
     */
    disconnect(): Promise<void>;
    disconnectServer(server_index: number): Promise<void>;
    /**
     * Pay one server's metered frames from `provider` when that server
     * requires credits (docs/CREDITS.md). `provider(credits)` returns
     * `{ kind, payload, credits }` or `null`; it is called from inside
     * query calls whenever the connection's balance runs short. Resolves
     * to `"not-enabled"`, `"not-required"`, `"required"`, or `"best-effort"`
     * (free while the server has room, paid only when busy). Call after
     * [`Self::upgrade_to_secure_channel`].
     */
    enableCredits(server_index: number, provider: Function): Promise<string>;
    /**
     * Fetch the database catalog from the server.
     *
     * Returns a [`WasmDatabaseCatalog`] wrapping the native catalog —
     * the same class returned by
     * `WasmDatabaseCatalog.fromJson(...)` for the TS fallback path, so
     * downstream sync-planning code works on both surfaces.
     */
    fetchCatalog(): Promise<WasmDatabaseCatalog>;
    /**
     * Fetch and install-or-compare one staged provider's catalog.
     */
    fetchCatalogFromServer(server_index: number): Promise<WasmDatabaseCatalog>;
    /**
     * Consume and install the exact proof handle returned by
     * `verifyDatabaseProof`. JavaScript must perform its production-pin
     * comparison before transferring ownership here.
     */
    installVerifiedDatabaseProof(proof: WasmDatabaseProof): void;
    isServerConnected(server_index: number): boolean;
    /**
     * Create a new DPF client. No network I/O happens until `connect` is
     * called.
     */
    constructor(server0_url: string, server1_url: string);
    /**
     * Register a JS callback to be invoked on every
     * [`ConnectionState`](pir_sdk::ConnectionState) transition.
     *
     * The callback receives a single `string` argument: one of
     * `"connecting"`, `"connected"`, `"disconnected"` (see
     * [`ConnectionState::as_str`](pir_sdk::ConnectionState::as_str)).
     * Replaces any previously registered callback — only one listener
     * per client. Pass-through behaviour matches the underlying
     * [`DpfClient::set_state_listener`].
     *
     * Callback exceptions are swallowed.
     */
    onStateChange(cb: Function): void;
    /**
     * Fetch and authenticate the bucket Merkle tree-tops before any private
     * address query is allowed to run.
     */
    preflightDatabase(db_id: number): Promise<void>;
    /**
     * Present credits (docs/CREDITS.md) on one server (`serverIndex` ∈
     * {0, 1}): `kind` 1 is a Cashu token, 2 an ARC payload from
     * [`crate::WasmArcCredential::present`]. Resolves to
     * `{ gasAdded, gasBalance }`. Bearer material: call after
     * [`Self::upgrade_to_secure_channel`].
     */
    presentCredits(server_index: number, kind: number, payload: Uint8Array): Promise<any>;
    /**
     * Low-level: query a single database by `db_id` without the
     * catalog/plan orchestration. Matches
     * `PirClient::query_batch`.
     *
     * Returns a JSON array of length `N`, each element either `null`
     * (not found) or a `QueryResult` JSON object (see
     * `WasmQueryResult.toJson()` for the shape).
     */
    queryBatch(script_hashes: Uint8Array, db_id: number): Promise<any>;
    /**
     * Release-safe inspector batch query. Native Rust retains every raw
     * INDEX/CHUNK bin, re-derives coordinates and decoded payloads from the
     * exact input order, and completes Merkle verification before this
     * promise resolves. A single failed slot rejects the whole batch; JS
     * never receives an unverified entry or an independently forgeable JSON
     * proof object.
     *
     * Returns a JS `Array` of length `N` (the input scripthash count).
     * Every slot is a non-null [`WasmQueryResult`] — not-found queries
     * are synthesised as empty inspector-populated results so the
     * absence-proof bins are preserved for verification.
     * Empty input or a database without bucket-Merkle commitments fails
     * before the private query phase.
     *
     * 🔒 Padding invariants are preserved (K=75 INDEX / K_CHUNK=80
     * CHUNK groups), including when most queries are not-found — the
     * wire-level batch is unchanged.
     */
    queryBatchVerified(script_hashes: Uint8Array, db_id: number): Promise<any>;
    /**
     * Return the two server URLs this client is connected to as a
     * `[string, string]` array (order matches the constructor:
     * `[server0_url, server1_url]`).
     *
     * Safe to call at any time — no network I/O, no connection state
     * needed.
     */
    serverUrls(): any;
    /**
     * Install a [`WasmAtomicMetrics`] recorder. All subsequent
     * connect / disconnect / byte / query-lifecycle events are
     * recorded on the shared atomic counters.
     *
     * Pre- and post-connect installs both work: if the client is
     * already connected, the recorder is pushed to both transports
     * immediately so it starts seeing byte traffic on the very next
     * frame; otherwise the handle is held until `connect` wires up
     * the fresh transports.
     *
     * The recorder is held behind an `Arc`, so installing the same
     * [`WasmAtomicMetrics`] on multiple clients aggregates counters
     * across all of them. Call [`clearMetricsRecorder`](Self::clear_metrics_recorder)
     * to uninstall.
     *
     * 🔒 Padding invariants unaffected — the metrics surface is
     * observational only and cannot influence the number or content
     * of padding queries sent.
     */
    setMetricsRecorder(metrics: WasmAtomicMetrics): void;
    /**
     * Select whether every query must be bound to proof-verified database
     * roots installed during the current connection.
     */
    setRequireVerifiedDatabaseRoots(require_verified: boolean): void;
    /**
     * Set one staged provider URL before that leg is connected.
     */
    setServerUrl(server_index: number, url: string): void;
    /**
     * End-to-end sync: fetch catalog, plan, execute all steps, merge
     * deltas. Returns a [`WasmSyncResult`] whose `results[i]`
     * corresponds to the i-th script hash in the packed input.
     *
     * # Arguments
     * * `script_hashes` — packed `Uint8Array` of length `20 * N`
     * * `last_height` — `null`/`undefined` for fresh sync, otherwise the
     *   last-synced height to compute a delta chain from
     */
    sync(script_hashes: Uint8Array, last_height?: number | null): Promise<WasmSyncResult>;
    /**
     * Run an end-to-end sync, firing progress events to the given JS
     * callback for every step transition.
     *
     * The callback receives a single argument — a plain JS object —
     * whose `type` discriminates: `"step_start"`, `"step_progress"`,
     * `"step_complete"`, `"complete"`, or `"error"`. See
     * [`JsSyncProgress`] for the exact field set per event type.
     *
     * Argument semantics match [`sync`](Self::sync) otherwise.
     * Callback exceptions are swallowed — a broken progress sink must
     * not take the sync down.
     */
    syncWithProgress(script_hashes: Uint8Array, last_height: number | null | undefined, progress: Function): Promise<WasmSyncResult>;
    /**
     * Upgrade one staged provider using only that leg's attestation-bound
     * ephemeral seed. No peer transport is inspected or modified.
     */
    upgradeServerToSecureChannel(server_index: number, server_static_pub: Uint8Array): Promise<void>;
    /**
     * Wrap both server connections with the encrypted-channel
     * transport.
     *
     * `serverStaticPub0` and `serverStaticPub1` are the X25519 pubkeys
     * the caller obtained (and verified) via [`Self::attest`]. Each
     * must be exactly 32 bytes; shorter or longer rejects with a
     * JsError. After this returns, every subsequent query through
     * this client is AEAD-sealed via `pir_channel`'s ChaCha20-Poly1305
     * frame format — cloudflared (or any other transport-layer
     * intermediary) sees only ciphertext.
     *
     * Uses the eph_seeds cached by [`Self::attest`] so the handshake's
     * `client_eph_pub` matches the one the SEV-SNP REPORT_DATA
     * committed to. **You MUST call `attest(0)` and `attest(1)` before
     * this method**, otherwise it rejects with a JsError. On success
     * the cached seeds are cleared (one-shot per attest call).
     *
     * Errors if either connection isn't established, either cached
     * eph_seed is missing, or either handshake fails. On error, the
     * connections are dropped — call [`Self::connect`] to re-establish.
     */
    upgradeToSecureChannel(server_static_pub_0: Uint8Array, server_static_pub_1: Uint8Array): Promise<void>;
    /**
     * Fetch and verify the attested-builder proof bundle for `dbId`.
     *
     * The proof is checked against the database catalog plus the supplied
     * production policy pins. `expectedParamsHashHex`,
     * `allowedBuilderBinarySha256Hex`, and `allowedBuilderGitCommit` may be
     * `undefined` / empty to skip that particular policy check. Mainnet
     * network magic is always enforced.
     */
    verifyDatabaseProof(db_id: number, expected_params_hash_hex?: string | null, allowed_builder_binary_sha256_hex?: string | null, allowed_builder_git_commit?: string | null): Promise<WasmDatabaseProof>;
    /**
     * Verify the proof returned by one exact staged provider.
     */
    verifyDatabaseProofFromServer(server_index: number, db_id: number, expected_params_hash_hex?: string | null, allowed_builder_binary_sha256_hex?: string | null, allowed_builder_git_commit?: string | null): Promise<WasmDatabaseProof>;
    /**
     * True while both `conn0` and `conn1` are live.
     */
    readonly isConnected: boolean;
}

/**
 * Two-server HarmonyPIR client (hint server + query server) exposed to
 * JavaScript.
 *
 * HarmonyPIR has a stateful hint phase — hints are fetched from the
 * hint server once per `(db_id, level)` and replayed against the query
 * server for each query. The wrapper preserves this: a single
 * `WasmHarmonyClient` reuses hints across multiple `sync` calls on the
 * same database, so amortised cost drops after the first query.
 *
 * ```javascript
 * import init, { WasmHarmonyClient } from 'pir-sdk-wasm';
 * await init();
 * const client = new WasmHarmonyClient('wss://hint...', 'wss://query...');
 * await client.connect();
 * const res = await client.sync(scriptHashesU8, null);
 * ```
 */
export class WasmHarmonyClient {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Send REQ_ANNOUNCE to the hint (`serverIndex=0`) or query
     * (`serverIndex=1`) server. See [`WasmDpfClient::announce`] for
     * full semantics.
     */
    announce(server_index: number): Promise<WasmAnnounceVerification>;
    /**
     * Send REQ_ATTEST to the hint (`serverIndex=0`) or query
     * (`serverIndex=1`) server and return the verification result.
     * See [`WasmDpfClient::attest`] for the full semantics (including
     * the bound-nonce derivation that ties this attestation to the
     * subsequent handshake).
     */
    attest(server_index: number): Promise<WasmAttestVerification>;
    /**
     * Return the effective 16-byte master key used by the loaded hint state.
     * V2 hint setup replaces the initial client key with a server-assigned
     * value, so browser persistence must read this value after hint download.
     */
    cacheMasterKey(): Uint8Array;
    /**
     * Return the effective PRP backend selected by V2 hint setup.
     */
    cachePrpBackend(): number;
    /**
     * Uninstall the currently-registered metrics recorder. See
     * [`WasmDpfClient::clear_metrics_recorder`].
     */
    clearMetricsRecorder(): void;
    /**
     * Open WebSocket connections to both hint and query servers.
     */
    connect(): Promise<void>;
    connectProvider(provider_index: number): Promise<void>;
    /**
     * Get the currently-loaded `db_id`, or `null` if no hints are
     * loaded. See [`HarmonyClient::db_id`] for semantics.
     */
    dbId(): number | undefined;
    /**
     * Close both WebSocket connections.
     */
    disconnect(): Promise<void>;
    disconnectProvider(provider_index: number): Promise<void>;
    /**
     * Pay the hint (0) or query (1) server's metered frames from
     * `provider` when it requires credits; see [`WasmDpfClient::enable_credits`]. `provider(credits)` returns
     * `{ kind, payload, credits }` or `null`; it is called from inside
     * query calls whenever the connection's balance runs short. Resolves
     * to `"not-enabled"`, `"not-required"`, `"required"`, or `"best-effort"`
     * (free while the server has room, paid only when busy). Call after
     * [`Self::upgrade_to_secure_channel`].
     */
    enableCredits(server_index: number, provider: Function): Promise<string>;
    /**
     * Byte size the blob [`save_hints`](Self::save_hints) would produce
     * right now. Returns `0` when no state is loaded or the client is
     * in an inconsistent state (e.g. catalog missing).
     *
     * O(total hint bytes); fine for UI-polling cadence but not for
     * the hot query path.
     */
    estimateHintSizeBytes(): number;
    /**
     * Fetch the database catalog from the hint server.
     */
    fetchCatalog(): Promise<WasmDatabaseCatalog>;
    fetchCatalogFromProvider(provider_index: number): Promise<WasmDatabaseCatalog>;
    /**
     * Pre-fetch every main and Merkle-sibling hint group needed to restore a
     * paid hint entitlement across page reloads. Requires proof-verified tree
     * tops to have been installed through `preflightDatabase` first.
     */
    fetchCompleteHintsWithProgress(catalog: WasmDatabaseCatalog, db_id: number, progress: Function): Promise<void>;
    /**
     * Pre-fetch the main hint state for `dbId`, firing `progress` after
     * each per-group response is loaded. Replaces the legacy "issue a
     * dummy query to warm hints" pattern with a dedicated entry point
     * that surfaces per-group progress directly.
     *
     * `progress` is invoked with one argument:
     * `{ done, total, phase }` (see `JsHintProgress` for the contract).
     * `total` equals `index_k + chunk_k` for the active database
     * (typically 75 + 80 = 155). On a cache hit / already-loaded
     * state, `progress` fires once with `done === total`.
     *
     * Rejects with `JsError` if the catalog doesn't carry `dbId` or
     * the client isn't connected.
     *
     * 🔒 Padding invariants are unaffected — wire shape matches the
     * no-progress hint-fetch path.
     */
    fetchHintsWithProgress(catalog: WasmDatabaseCatalog, db_id: number, progress: Function): Promise<void>;
    /**
     * 16-byte fingerprint of the cache key for the given catalog +
     * `db_id`, under this client's current master key and PRP backend.
     * Returns a fresh `Uint8Array` of length 16 on success.
     *
     * Rejects with `JsError` when the catalog doesn't carry `db_id`.
     * The fingerprint matches the one embedded in the `saveHints` blob
     * header and the on-disk cache filename stem, so the JS-side
     * IndexedDB bridge can key cache entries on it directly.
     */
    fingerprint(catalog: WasmDatabaseCatalog, db_id: number): Uint8Array;
    /**
     * True only when every main and authenticated sibling hint group for the
     * proof-verified database is present in memory.
     */
    hasCompleteHints(catalog: WasmDatabaseCatalog, db_id: number): boolean;
    /**
     * Consume and install the exact proof handle returned by
     * `verifyDatabaseProof` after the browser's production-pin comparison.
     */
    installVerifiedDatabaseProof(proof: WasmDatabaseProof): void;
    isProviderConnected(provider_index: number): boolean;
    /**
     * Restore only a complete paid hint resource. The native client requires
     * proof-verified tree tops for `dbId` and rejects main-only or malformed
     * sibling state, clearing the partial in-memory bundle on failure.
     */
    loadCompleteHints(bytes: Uint8Array, catalog: WasmDatabaseCatalog, db_id: number): void;
    /**
     * Restore hint state from a blob previously produced by
     * [`saveHints`](Self::save_hints).
     *
     * The blob's embedded fingerprint is cross-checked against
     * `(masterKey, prpBackend, catalog.get(db_id))`: a mismatch (wrong
     * db shape, different master key, etc.) rejects with `JsError`
     * rather than silently loading stale hints. Rejects with `JsError`
     * when the catalog doesn't carry `db_id`.
     *
     * On success the client transitions into the same state it would
     * be in after a fresh `sync` / `queryBatch` against `db_id` — i.e.
     * `dbId() === db_id`, main `HarmonyGroup`s are populated, and the
     * next query skips the hint-fetch network roundtrips.
     */
    loadHints(bytes: Uint8Array, catalog: WasmDatabaseCatalog, db_id: number): void;
    /**
     * Minimum remaining per-group query budget across every loaded
     * `HarmonyGroup`. Returns `null` when nothing is loaded — callers
     * should treat that as "unknown, call `sync` or `queryBatch` first".
     *
     * UI surfaces use this to decide when to proactively refresh hints.
     */
    minQueriesRemaining(): number | undefined;
    /**
     * Create a new HarmonyPIR client. Generates a random master PRP key
     * from `performance.now()`-ish entropy (see `HarmonyClient::new`).
     * Callers that want a stable key (e.g. to reuse cached hints across
     * sessions) must call `setMasterKey`.
     */
    constructor(hint_server_url: string, query_server_url: string);
    /**
     * Register a JS callback to be invoked on every
     * [`ConnectionState`](pir_sdk::ConnectionState) transition. See
     * [`WasmDpfClient::on_state_change`].
     */
    onStateChange(cb: Function): void;
    /**
     * Fetch and authenticate the bucket Merkle tree-tops before any private
     * address query is allowed to run.
     */
    preflightDatabase(db_id: number): Promise<void>;
    /**
     * Present credits (docs/CREDITS.md) on the hint (0) or query (1)
     * server; resolves to `{ gasAdded, gasBalance }`. See
     * [`WasmDpfClient::present_credits`].
     */
    presentCredits(server_index: number, kind: number, payload: Uint8Array): Promise<any>;
    /**
     * Low-level: query a single database by `db_id`. See
     * [`WasmDpfClient::query_batch`].
     */
    queryBatch(script_hashes: Uint8Array, db_id: number): Promise<any>;
    /**
     * Release-safe inspector batch query. See
     * [`WasmDpfClient::query_batch_verified`] for the all-or-nothing
     * verification and JS-boundary contract.
     * Empty input or a database without bucket-Merkle commitments fails
     * before the private query phase.
     *
     * 🔒 Padding invariants are preserved (K=75 INDEX / K_CHUNK=80
     * CHUNK groups) — padding lives in the native `HarmonyClient` query
     * path that this wrapper delegates to.
     */
    queryBatchVerified(script_hashes: Uint8Array, db_id: number): Promise<any>;
    /**
     * Serialise the currently-loaded hint state to a self-describing
     * binary blob. Returns a fresh `Uint8Array`, or `null` if no hints
     * are loaded.
     *
     * The blob embeds a 16-byte fingerprint (see
     * [`fingerprint`](Self::fingerprint)) so a later `loadHints` call
     * against a mismatched database or master key fails cleanly
     * instead of returning corrupted state. Safe to persist to
     * IndexedDB as an opaque byte array.
     */
    saveHints(): any;
    /**
     * Return the two server URLs this client is connected to as a
     * `[string, string]` array (order matches the constructor:
     * `[hint_server_url, query_server_url]`).
     *
     * Safe to call at any time — no network I/O, no connection state
     * needed. Mirrors [`WasmDpfClient::server_urls`].
     */
    serverUrls(): any;
    /**
     * Pin this client's hint state to `db_id`. If hints for a different
     * db are currently loaded, invalidates them — the next
     * `sync`/`queryBatch`/`queryBatchVerified` will re-fetch (or restore
     * from the hint cache if configured).
     *
     * Idempotent when `db_id` already matches the loaded state.
     */
    setDbId(db_id: number): void;
    /**
     * Override the 16-byte master PRP key. Invalidates any previously
     * loaded hints — the next `sync`/`queryBatch` call will re-fetch.
     *
     * Rejects if `key` is not exactly 16 bytes.
     */
    setMasterKey(key: Uint8Array): void;
    /**
     * Install a [`WasmAtomicMetrics`] recorder.
     *
     * See [`WasmDpfClient::set_metrics_recorder`] for the full
     * install + aggregation contract — the Harmony implementation
     * propagates the handle to both transports (hint + query) with
     * the `"harmony"` backend label, so a single
     * [`WasmAtomicMetrics`] installed on a DPF and a Harmony client
     * simultaneously can aggregate counters across both backends.
     *
     * 🔒 Padding invariants unaffected.
     */
    setMetricsRecorder(metrics: WasmAtomicMetrics): void;
    setProviderUrl(provider_index: number, url: string): void;
    /**
     * Select the PRP backend.
     *
     * Accepts [`PRP_HMR12`] or [`PRP_FASTPRP`].
     * [`PRP_HMR12`] is the reference backend (always
     * available); the faster backends require the corresponding cargo
     * features on the enclosing build.
     */
    setPrpBackend(backend: number): void;
    /**
     * Select whether every query must be bound to proof-verified database
     * roots installed during the current connection.
     */
    setRequireVerifiedDatabaseRoots(require_verified: boolean): void;
    /**
     * End-to-end sync. See [`WasmDpfClient::sync`] for argument
     * semantics — the wire path differs but the JS-facing shape is
     * identical.
     */
    sync(script_hashes: Uint8Array, last_height?: number | null): Promise<WasmSyncResult>;
    /**
     * Run an end-to-end sync, firing progress events to the given JS
     * callback for every step transition. See
     * [`WasmDpfClient::sync_with_progress`] for the full argument +
     * event-shape contract.
     */
    syncWithProgress(script_hashes: Uint8Array, last_height: number | null | undefined, progress: Function): Promise<WasmSyncResult>;
    upgradeProviderToSecureChannel(provider_index: number, server_static_pub: Uint8Array): Promise<void>;
    /**
     * Wrap both server connections (hint + query) with the encrypted
     * channel transport. See [`WasmDpfClient::upgrade_to_secure_channel`]
     * — same eph_seed caching + binding flow. Argument order matches
     * `serverUrls()` — `(hint, query)`.
     */
    upgradeToSecureChannel(hint_server_static_pub: Uint8Array, query_server_static_pub: Uint8Array): Promise<void>;
    /**
     * Fetch and verify the attested-builder proof bundle for `dbId`.
     *
     * See [`WasmDpfClient::verify_database_proof`] for policy argument
     * semantics. Mainnet network magic is always enforced.
     */
    verifyDatabaseProof(db_id: number, expected_params_hash_hex?: string | null, allowed_builder_binary_sha256_hex?: string | null, allowed_builder_git_commit?: string | null): Promise<WasmDatabaseProof>;
    verifyDatabaseProofFromProvider(provider_index: number, db_id: number, expected_params_hash_hex?: string | null, allowed_builder_binary_sha256_hex?: string | null, allowed_builder_git_commit?: string | null): Promise<WasmDatabaseProof>;
    /**
     * True while both connections are live.
     */
    readonly isConnected: boolean;
}

/**
 * Single-server ORAM client exposed to JavaScript.
 *
 * This is the TEE backend path: JavaScript authenticates one attested server,
 * upgrades that WebSocket to the encrypted channel, then sends plaintext
 * script hashes inside the channel. Server-side ORAM hides the INDEX and
 * CHUNK address trace. Unlike DPF/Harmony, this path does not use the PBC
 * cuckoo-bucket layout on the client boundary; `queryBatch` returns decoded
 * direct-entry CHUNK results.
 */
export class WasmOramClient {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Send REQ_ANNOUNCE and return the parsed operator-signed identity
     * bundle.
     */
    announce(): Promise<WasmAnnounceVerification>;
    /**
     * Send REQ_ATTEST and return the parsed verification result.
     *
     * The nonce is bound to the X25519 ephemeral public key that
     * `upgradeToSecureChannel` will use next, matching the DPF/Harmony
     * bound-attestation flow.
     */
    attest(): Promise<WasmAttestVerification>;
    /**
     * Uninstall the currently-registered metrics recorder.
     */
    clearMetricsRecorder(): void;
    /**
     * Open the WebSocket connection.
     */
    connect(): Promise<void>;
    /**
     * Close the WebSocket connection and clear cached catalog state.
     */
    disconnect(): Promise<void>;
    /**
     * Pay the server's metered frames from `provider` when it requires
     * credits; see [`WasmDpfClient::enable_credits`].
     */
    enableCredits(provider: Function): Promise<string>;
    /**
     * Fetch the database catalog from the ORAM server.
     */
    fetchCatalog(): Promise<WasmDatabaseCatalog>;
    /**
     * Install a proof only after JavaScript has checked production pins.
     */
    installVerifiedDatabaseProof(proof: WasmDatabaseProof): void;
    /**
     * Create a new ORAM client. No network I/O happens until `connect`.
     */
    constructor(server_url: string);
    /**
     * Present credits (docs/CREDITS.md) on the connection; resolves to
     * `{ gasAdded, gasBalance }`. See [`WasmDpfClient::present_credits`].
     */
    presentCredits(kind: number, payload: Uint8Array): Promise<any>;
    /**
     * Low-level ORAM batch query against one database.
     *
     * Returns a JSON array of length `N`, each element either `null`
     * (not found) or the same `QueryResult` JSON object returned by the
     * DPF/Harmony wrappers.
     */
    queryBatch(script_hashes: Uint8Array, db_id: number): Promise<any>;
    /**
     * Low-level ORAM batch query padded to `paddedSlots`.
     *
     * The JS input contains only real script hashes. The native ORAM client
     * appends explicit empty slots before sending `REQ_ORAM_LOOKUP`, so the
     * TEE spends the same INDEX schedule without treating padding as keys.
     * The returned JSON array contains only the real input results.
     */
    queryBatchPadded(script_hashes: Uint8Array, db_id: number, padded_slots: number): Promise<any>;
    /**
     * Return the configured server URL.
     */
    serverUrl(): string;
    /**
     * Install a [`WasmAtomicMetrics`] recorder.
     */
    setMetricsRecorder(metrics: WasmAtomicMetrics): void;
    /**
     * Require proof-root installation before ORAM query/admission.
     */
    setRequireVerifiedDatabaseRoots(require_verified: boolean): void;
    /**
     * Wrap the single server connection with the encrypted-channel transport.
     *
     * `serverStaticPub` must be the 32-byte key from a verified attestation
     * or announcement. `attest()` must be called first so the channel
     * ephemeral key is bound into the SEV-SNP report nonce.
     */
    upgradeToSecureChannel(server_static_pub: Uint8Array): Promise<void>;
    /**
     * Fetch and verify the attested-builder proof bundle for `dbId`.
     *
     * Uses the same production policy pins and catalog cross-check as
     * `WasmDpfClient.verifyDatabaseProof` and
     * `WasmHarmonyClient.verifyDatabaseProof`.
     */
    verifyDatabaseProof(db_id: number, expected_params_hash_hex?: string | null, allowed_builder_binary_sha256_hex?: string | null, allowed_builder_git_commit?: string | null): Promise<WasmDatabaseProof>;
    /**
     * True while the single ORAM server connection is live.
     */
    readonly isConnected: boolean;
}

/**
 * JS-visible policy requirements for [`WasmAttestVerification::verify_full`].
 * Constructed with sensible production defaults (strict). Mutate
 * individual fields via the setters to relax.
 */
export class WasmPolicyRequirements {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Construct the strictest production policy: VMPL 0, no debug,
     * no MA migration, TCB-monotonic. No measurement / family /
     * image pin (set via the corresponding setters if you want them).
     */
    constructor();
    /**
     * Permit guests with `policy.debug_allowed` set. Production: leave false.
     */
    setAllowDebug(v: boolean): void;
    /**
     * Permit guests with `policy.migrate_ma_allowed` set. Production: leave false.
     */
    setAllowMigrateMa(v: boolean): void;
    /**
     * Pin the expected family_id (16 bytes).
     */
    setExpectedFamilyId(bytes: Uint8Array): void;
    /**
     * Pin the expected image_id (16 bytes).
     */
    setExpectedImageId(bytes: Uint8Array): void;
    /**
     * Pin the expected MEASUREMENT (48 bytes). Must be exactly 48
     * bytes or a JsError is thrown. Set to the operator-published
     * value for your Tier 3 UKI.
     */
    setExpectedMeasurement(bytes: Uint8Array): void;
    /**
     * Raise the VMPL ceiling. Production: leave at 0.
     */
    setMaxVmpl(v: number): void;
    /**
     * Require guests to have `policy.single_socket_required`. Off by default.
     */
    setRequireSingleSocket(v: boolean): void;
}

/**
 * WASM wrapper for QueryResult.
 */
export class WasmQueryResult {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Inspector state: every CHUNK cuckoo bin that backed a decoded
     * UTXO, as a JSON array of `{pbcGroup, binIndex, binContent}`
     * objects. Empty for not-found, whale, or zero-chunk matches.
     */
    chunkBins(): any;
    /**
     * Create an unverified result from JSON.
     *
     * A caller-supplied `merkleVerified` property is ignored and the result
     * is always marked `false`. JSON import is a data-compatibility API, not
     * a proof or release boundary.
     */
    static fromJson(json: any): WasmQueryResult;
    /**
     * Get entry at index as JSON.
     */
    getEntry(index: number): any;
    /**
     * Inspector state: every INDEX cuckoo bin probed for this query,
     * as a JSON array of `{pbcGroup, binIndex, binContent}` objects.
     *
     * Only non-empty for `QueryResult`s produced by the inspector path
     * (e.g. `WasmDpfClient.queryBatchVerified`). Populated for found,
     * not-found, and whale alike — the item-count symmetry invariant
     * guarantees this array always has `INDEX_CUCKOO_NUM_HASHES = 2`
     * entries for an inspector-path result.
     */
    indexBins(): any;
    /**
     * Inspector state: if this query resolved to a match, the index
     * within [`indexBins`] of the matching bin. Returns `undefined`
     * for not-found / inspector-free results.
     */
    matchedIndexIdx(): any;
    /**
     * Create an empty, unverified result.
     */
    constructor();
    /**
     * Raw chunk bytes for delta-database queries, or `undefined` for
     * full-snapshot queries (and for queries that didn't hit the
     * inspector path).
     *
     * The browser needs these bytes to decode the delta payload
     * (`decodeDeltaData`) and merge it onto a cached snapshot. For
     * full-snapshot queries they are `None` because the decoded
     * `entries` already hold the canonical state — there is no
     * second-layer merge to feed.
     *
     * Populated natively by the release-safe verified inspector query
     * (when `db_info.kind.is_delta()`) and surfaced here as a
     * `Uint8Array`. This getter is the only way the web client can
     * obtain the bytes — `toJson()` emits them as a hex string so that
     * persisted results also carry the delta payload across reloads.
     */
    rawChunkData(): any;
    /**
     * Convert to JSON.
     *
     * The emitted object is accepted by [`fromJson`] as a data round-trip,
     * including optional inspector fields (`indexBins`, `chunkBins`,
     * `matchedIndexIdx`). It is deliberately not accepted as proof input by
     * DPF/Harmony clients; a deserialized result has no release authority.
     */
    toJson(): any;
    /**
     * Number of UTXO entries.
     */
    readonly entryCount: number;
    /**
     * Whether this is a whale address.
     */
    readonly isWhale: boolean;
    /**
     * Whether a native query/sync path established a positive per-bucket
     * Merkle release verdict (or established that commitments are N/A).
     *
     * `WasmQueryResult::new()` and `fromJson()` always return `false`; only
     * crate-internal native SDK paths can set the private provenance marker.
     * A `false` value means unauthenticated/unreleased (including unverified,
     * tainted, or failed), so callers must never interpret it as merely an
     * attempted failure.
     */
    readonly merkleVerified: boolean;
    /**
     * Total balance in satoshis.
     */
    readonly totalBalance: bigint;
}

export class WasmStandaloneSecureChannelV1 {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Canonical cleartext `REQ_ATTEST` frame for this channel attempt.
     */
    attestRequest(): Uint8Array;
    /**
     * Consume the handshake secret and install the AEAD session.
     */
    completeHandshake(response_frame: Uint8Array, server_static_pub: Uint8Array): void;
    /**
     * Canonical cleartext `REQ_HANDSHAKE` using the same hidden ephemeral
     * key committed by [`Self::attest_request`].
     */
    handshakeRequest(): Uint8Array;
    /**
     * Create one one-shot, attestation-bound channel attempt.
     */
    constructor();
    /**
     * Authenticate and open one complete length-prefixed server frame.
     */
    openFrame(frame: Uint8Array): Uint8Array;
    /**
     * Seal one complete length-prefixed BitcoinPIR frame.
     */
    sealFrame(frame: Uint8Array): Uint8Array;
    /**
     * Non-secret exporter used by service authorization transcript binding.
     */
    serviceAuthorizationExporterV1(): Uint8Array;
    /**
     * Verify a same-socket `RESP_ATTEST` with the nonce bound to our hidden
     * X25519 ephemeral key. The returned handle retains all existing AMD
     * chain, binary-pin and policy verification methods.
     */
    verifyAttestation(response_frame: Uint8Array): WasmAttestVerification;
    readonly established: boolean;
}

/**
 * WASM wrapper for SyncPlan.
 */
export class WasmSyncPlan {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get a step by index.
     */
    getStep(index: number): any;
    /**
     * Get all steps as JSON array.
     */
    toJson(): any;
    /**
     * Whether the plan is empty (already at tip).
     */
    readonly isEmpty: boolean;
    /**
     * Whether this is a fresh sync.
     */
    readonly isFreshSync: boolean;
    /**
     * Number of steps in the plan.
     */
    readonly stepsCount: number;
    /**
     * Target height after sync.
     */
    readonly targetHeight: number;
}

/**
 * WASM wrapper for [`SyncResult`].
 *
 * Exposes the merged per-script-hash results plus sync metadata
 * (`syncedHeight`, `wasFreshSync`). Entries are surfaced both as
 * individual [`WasmQueryResult`] objects (so callers that already use
 * the typed class get the same API) and as a JSON blob (so callers that
 * just want to splat the result into a UI get a plain object).
 */
export class WasmSyncResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get the per-script-hash [`WasmQueryResult`] at `index`, or `null`
     * if the script hash was not found (and Merkle-verified absent when
     * the DB publishes commitments).
     *
     * Mirrors the `results: Vec<Option<QueryResult>>` shape of the
     * underlying sync: `None` = verified absent, `Some(qr)` with
     * `merkleVerified = false` = untrusted/tainted result.
     */
    getResult(index: number): WasmQueryResult | undefined;
    /**
     * Convert the full sync result to a data-only plain JSON object.
     * Verification provenance cannot survive conversion to caller-mutable
     * JSON, so every `merkleVerified` property is false. Use `getResult()`
     * to retain the opaque native provenance marker.
     *
     * Shape:
     * ```json
     * {
     *   "results": [
     *     null,
     *     { "entries": [...], "isWhale": false,
     *       "totalBalance": 0, "merkleVerified": false }
     *   ],
     *   "syncedHeight": 900000,
     *   "wasFreshSync": true
     * }
     * ```
     */
    toJson(): any;
    /**
     * Number of per-script-hash result slots (= length of the input
     * `scriptHashes` array passed to `sync`).
     */
    readonly resultCount: number;
    /**
     * Synced height — the tip height the final merged result reflects.
     *
     * For servers that don't publish a height (legacy Harmony without
     * `REQ_GET_DB_CATALOG`), this is `0`. See `CLAUDE.md` →
     * "HarmonyClient REQ_GET_DB_CATALOG with legacy fallback" for the
     * upgrade path.
     */
    readonly syncedHeight: number;
    /**
     * Whether the sync started from a fresh snapshot (vs an incremental
     * delta chain from a previous height).
     */
    readonly wasFreshSync: boolean;
}

/**
 * Auto-invoked by the wasm-bindgen loader once the module is
 * instantiated. Installs a browser-friendly panic hook so Rust
 * `panic!`s surface in the JS console with a readable message and
 * stack trace instead of the bare `RuntimeError: unreachable` that
 * `wasm32-unknown-unknown` emits by default.
 */
export function __wasm_init(): void;

/**
 * `SHA256(bin_index_u32_LE || bin_content)` — the leaf commitment used by
 * every per-bucket bin-Merkle tree.
 */
export function bucketMerkleLeafHash(bin_index: number, bin_content: Uint8Array): Uint8Array;

/**
 * Compute an arity-N internal-node hash: `SHA256(child_0 || child_1 || …)`.
 *
 * `children_flat` must be a multiple of 32 bytes (one 32B hash per child).
 * Returns an empty array on malformed input so JS can coerce it to a
 * verification failure.
 */
export function bucketMerkleParentN(children_flat: Uint8Array): Uint8Array;

/**
 * SHA-256 of `data`. Thin wrapper over `pir_core::merkle::sha256` exposed so
 * JS can drop its own polyfill in favour of the same implementation used by
 * the server and native Rust client.
 */
export function bucketMerkleSha256(data: Uint8Array): Uint8Array;

/**
 * Compute an optimal sync plan from the catalog.
 *
 * # Arguments
 * * `catalog` - Database catalog from server
 * * `last_synced_height` - Last synced height (0 or undefined for fresh sync)
 *
 * # Returns
 * A WasmSyncPlan with steps to execute.
 */
export function computeSyncPlan(catalog: WasmDatabaseCatalog, last_synced_height?: number | null): WasmSyncPlan;

/**
 * Compute fingerprint tag. Returns 8 bytes (LE).
 */
export function computeTag(tag_seed_hi: number, tag_seed_lo: number, script_hash: Uint8Array): Uint8Array;

/**
 * Cuckoo hash a script hash.
 */
export function cuckooHash(script_hash: Uint8Array, key_hi: number, key_lo: number, num_bins: number): number;

/**
 * Cuckoo hash an integer chunk ID.
 */
export function cuckooHashInt(chunk_id: number, key_hi: number, key_lo: number, num_bins: number): number;

/**
 * Cuckoo-place items into groups.
 */
export function cuckooPlace(cand_groups_flat: Uint32Array, num_items: number, num_groups: number, max_kicks: number, num_hashes: number): Int32Array;

/**
 * Decode delta data from raw bytes.
 *
 * Returns JSON with `spent` (array of outpoint hex strings) and
 * `newUtxos` (array of UTXO entries).
 */
export function decodeDeltaData(raw: Uint8Array): any;

/**
 * Decode UTXO data from bytes. Returns JSON array.
 */
export function decodeUtxoData(data: Uint8Array): any;

/**
 * Derive 3 group indices for a chunk ID.
 */
export function deriveChunkGroups(chunk_id: number, k: number): Uint32Array;

/**
 * Derive cuckoo hash key. Returns 8 bytes (LE).
 */
export function deriveCuckooKey(master_seed_hi: number, master_seed_lo: number, group_id: number, hash_fn: number): Uint8Array;

/**
 * Derive 3 group indices for a script hash.
 */
export function deriveGroups(script_hash: Uint8Array, k: number): Uint32Array;

/**
 * Decode the per-group sub-query `count` fields from a
 * `REQ_HARMONY_BATCH_QUERY` (opcode `0x43`) frame, returning one entry
 * per `(group, sub_query)` slot in declaration order so JS can assert
 * **HarmonyPIR Per-Group Request-Count Symmetry** on observed traffic.
 *
 * # Input shapes accepted
 *
 * `frame` may be supplied in either of the two shapes a wire-explorer
 * is likely to capture:
 *
 * 1. **Full wire frame** — `[4B payload_len LE][1B opcode = 0x43][payload]`,
 *    matching the bytes emitted on the WebSocket by
 *    `pir_runtime_core::protocol::Request::encode`. Auto-detected when
 *    `frame.len() >= 5`, the leading u32 equals `frame.len() - 4`, and
 *    `frame[4] == 0x43`.
 * 2. **Stripped payload** — `[1B opcode = 0x43][payload]`, the shape a
 *    middleware that already peels the length envelope would expose.
 *    Auto-detected when the full-frame check fails but `frame[0] == 0x43`.
 * 3. **Raw payload** — just `[payload]` (no envelope, no opcode). Used
 *    as the fallback when neither (1) nor (2) match. Callers who pre-
 *    strip the opcode should hit this branch.
 *
 * # Output
 *
 * A flat `Uint32Array` of length `num_groups × sub_queries_per_group`,
 * in `(group, sub_query)` row-major order — i.e. the first
 * `sub_queries_per_group` entries belong to group 0, the next slab to
 * group 1, and so on. JS callers reshape with the same
 * `sub_queries_per_group` they read elsewhere in the frame.
 *
 * Symmetry-check pattern:
 * ```text
 * const counts = harmony_decode_counts(frameBytes);
 * const t = readTFromHintsResponseElsewhere(); // T from REQ_HARMONY_HINTS
 * const ok = counts.every(c => c === t - 1);   // privacy invariant
 * ```
 *
 * # Errors
 *
 * Returns `Err(JsError)` for: empty input, opcode not `0x43` (when the
 * envelope check fails on a non-payload-shaped buffer), truncated header
 * (< 6 payload bytes), per-group `count` declared larger than the
 * remaining payload, or any other inconsistency that would also trip
 * the canonical native decoder.
 */
export function harmony_decode_counts(frame: Uint8Array): Uint32Array;

/**
 * Install a [`tracing-wasm`] subscriber as the global `tracing` default.
 *
 * Call once at app startup after `await init()`. Subsequent calls are
 * no-ops (guarded by [`std::sync::Once`]), so invoking from multiple
 * initialization paths is safe.
 *
 * On native targets (`cargo test -p pir-sdk-wasm`) the underlying
 * `tracing-wasm::set_as_global_default` is `cfg(target_arch = "wasm32")`
 * guarded, so this function is effectively a no-op there. A native test
 * that wants tracing output should install
 * `tracing_subscriber::fmt::fmt()` directly — see the Phase 1 span
 * smoke tests in `pir-sdk-client` for the canonical pattern.
 *
 * [`tracing-wasm`]: https://crates.io/crates/tracing-wasm
 */
export function initTracingSubscriber(): void;

/**
 * Merge delta into a snapshot result.
 *
 * # Arguments
 * * `snapshot` - The snapshot QueryResult
 * * `delta_raw` - Raw delta chunk data bytes
 *
 * # Returns
 * A new unverified WasmQueryResult with the delta applied. The caller supplies
 * `delta_raw`, so merging always drops snapshot verification authority; the
 * merged payload requires a fresh native verification before release.
 */
export function mergeDelta(snapshot: WasmQueryResult, delta_raw: Uint8Array): WasmQueryResult;

/**
 * Plan multi-round PBC placement. Returns JSON.
 */
export function planRounds(item_groups_flat: Uint32Array, items_per: number, num_groups: number, num_hashes: number, max_kicks: number): any;

/**
 * Read a LEB128 varint. Returns [value_lo, value_hi, bytes_consumed].
 */
export function readVarint(data: Uint8Array, offset: number): Uint32Array;

/**
 * Splitmix64 finalizer. Returns 8 bytes (LE).
 */
export function splitmix64(x_hi: number, x_lo: number): Uint8Array;

/**
 * JS-visible accessor for the Turin ARK fingerprint pinned in
 * pir-attest-verify (matches `web/src/attest-pin.ts`). Returns the
 * 32-byte SHA-256 as a Uint8Array. Pass directly to
 * [`WasmAttestVerification::verify_full`] /
 * [`WasmAttestVerification::verify_vcek_chain`] for Turin servers.
 */
export function turinArkFingerprint(): Uint8Array;

/**
 * Parse + verify a raw RESP_ANNOUNCE wire payload (the response frame
 * starting at the variant byte) into a [`WasmAnnounceVerification`],
 * running the in-bundle chain check. Throws on a wire-format violation
 * or a server `RESP_ERROR` envelope (e.g. "announce not configured").
 *
 * This is for transports that don't go through `WasmDpfClient` — the
 * standalone TS `OnionPirWebClient` does its own REQ_ANNOUNCE
 * round-trip over its WebSocket and hands the response bytes here, so
 * it reuses the exact same Rust parsing + chain verification (and the
 * `checkPinnedOperator` / `checkChannelBinding` methods on the result)
 * instead of reimplementing Ed25519 verification in TS. Mirrors the
 * Rust `pir_sdk_client::announce::parse_announce_response`.
 */
export function verifyAnnounceResponse(resp_payload: Uint8Array): WasmAnnounceVerification;

/**
 * Walk one bin-Merkle proof from leaf to root.
 *
 * `sibling_rows_flat` must carry `cache_from_level × BUCKET_MERKLE_SIB_ROW_SIZE`
 * bytes, with one 256B row per sibling level, bottom-up. Each row is the
 * XOR of server0 ⊕ server1 responses to that level's `REQ_BUCKET_MERKLE_SIB_BATCH`
 * query — it holds the 8 child hashes at `(node_idx / 8) × 8 .. +8`, one of
 * which is this item's current hash. The walker recomputes the parent by
 * substituting the running hash at `node_idx % 8`.
 *
 * After `cache_from_level` sibling rounds, the walker reads the cached
 * levels from `tree_tops[pbc_group]` and keeps combining children until it
 * reaches the root; the result is compared against the published root.
 *
 * Returns `true` iff the reconstruction matches. Any shape mismatch (row
 * too short, out-of-range group, missing tree-top, etc.) returns `false`
 * rather than erroring — it's a verification failure, not a programming
 * bug, and the caller must already handle "some items failed" as a normal
 * outcome (the native client coerces failures to `QueryResult::merkle_failed()`).
 *
 * See `pir-sdk-client::merkle_verify::verify_sibling_levels` for the
 * reference implementation this tracks; the two functions must stay in sync.
 */
export function verifyBucketMerkleItem(bin_index: number, bin_content: Uint8Array, pbc_group: number, sibling_rows_flat: Uint8Array, tree_tops: WasmBucketMerkleTreeTops): boolean;

/**
 * Verify a complete, length-prefixed `RESP_DB_PROOF` frame without owning a
 * WebSocket or PIR client.
 *
 * This is the authoritative verifier for transports that remain in
 * JavaScript, notably the standalone OnionPIR browser client.  `responseFrame`
 * must be exactly one record in the shape returned by that client's
 * `ManagedWebSocket.sendRaw`: `[u32 payload_len LE][opcode][body...]`.
 * The outer length, response opcode, requested database ID, catalog anchors,
 * attested-builder proof, and supplied policy pins are all checked before an
 * opaque [`WasmDatabaseProof`] is returned.
 *
 * The function is stateless and does not install roots.  JavaScript must
 * compare every exposed field with its production pin and then explicitly
 * transfer the same handle into its OnionPIR session root store.
 */
export function verifyDatabaseProofResponse(response_frame: Uint8Array, catalog: WasmDatabaseCatalog, expected_db_id: number, expected_params_hash_hex?: string | null, allowed_builder_binary_sha256_hex?: string | null, allowed_builder_git_commit?: string | null): WasmDatabaseProof;

/**
 * Strict OnionPIR verifier. It accepts only the v2 opcode/bundle/evidence
 * stack and therefore cannot silently fall back to a v1 proof.
 */
export function verifyDatabaseProofV2Response(response_frame: Uint8Array, catalog: WasmDatabaseCatalog, expected_db_id: number, expected_params_hash_hex?: string | null, allowed_builder_binary_sha256_hex?: string | null, allowed_builder_git_commit?: string | null): WasmDatabaseProof;

/**
 * Verify a standalone SEV-SNP report and PEM certificate chain.
 *
 * This is the static-artifact companion to
 * [`WasmAttestVerification::verify_full`]. Live runtime attestation gets
 * its report and VCEK chain from the server response; database-authenticity
 * proof pages load the same shape from `/proofs/...` static files instead.
 */
export function verifyRawSnpReport(report_bytes: Uint8Array, ark_pem: string, ask_pem: string, vcek_pem: string, expected_ark_fingerprint: Uint8Array | null | undefined, policy: WasmPolicyRequirements): void;

/**
 * XOR two sibling-batch responses of equal length and return the result.
 *
 * Returns an empty array if the inputs are different lengths (the DPF XOR
 * only makes sense for identical-length responses; a mismatch is always a
 * protocol error the caller should surface as a verification failure).
 *
 * This is a convenience for JS so the `server0 ⊕ server1` fold lives next
 * to the rest of the verifier instead of being hand-rolled per client.
 */
export function xorBuffers(a: Uint8Array, b: Uint8Array): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly PRP_FASTPRP: () => number;
    readonly PRP_HMR12: () => number;
    readonly __wbg_wasmannounceverification_free: (a: number, b: number) => void;
    readonly __wbg_wasmarccredential_free: (a: number, b: number) => void;
    readonly __wbg_wasmarccredentialrequest_free: (a: number, b: number) => void;
    readonly __wbg_wasmatomicmetrics_free: (a: number, b: number) => void;
    readonly __wbg_wasmattestverification_free: (a: number, b: number) => void;
    readonly __wbg_wasmbucketmerkletreetops_free: (a: number, b: number) => void;
    readonly __wbg_wasmdatabasecatalog_free: (a: number, b: number) => void;
    readonly __wbg_wasmdatabaseproof_free: (a: number, b: number) => void;
    readonly __wbg_wasmdpfclient_free: (a: number, b: number) => void;
    readonly __wbg_wasmharmonyclient_free: (a: number, b: number) => void;
    readonly __wbg_wasmoramclient_free: (a: number, b: number) => void;
    readonly __wbg_wasmpolicyrequirements_free: (a: number, b: number) => void;
    readonly __wbg_wasmqueryresult_free: (a: number, b: number) => void;
    readonly __wbg_wasmstandalonesecurechannelv1_free: (a: number, b: number) => void;
    readonly __wbg_wasmsyncplan_free: (a: number, b: number) => void;
    readonly __wbg_wasmsyncresult_free: (a: number, b: number) => void;
    readonly bucketMerkleLeafHash: (a: number, b: number, c: number) => [number, number];
    readonly bucketMerkleParentN: (a: number, b: number) => [number, number];
    readonly bucketMerkleSha256: (a: number, b: number) => [number, number];
    readonly computeSyncPlan: (a: number, b: number) => [number, number, number];
    readonly computeTag: (a: number, b: number, c: number, d: number) => [number, number];
    readonly cuckooHash: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly cuckooHashInt: (a: number, b: number, c: number, d: number) => number;
    readonly cuckooPlace: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly decodeDeltaData: (a: number, b: number) => [number, number, number];
    readonly decodeUtxoData: (a: number, b: number) => any;
    readonly deriveChunkGroups: (a: number, b: number) => [number, number];
    readonly deriveCuckooKey: (a: number, b: number, c: number, d: number) => [number, number];
    readonly deriveGroups: (a: number, b: number, c: number) => [number, number];
    readonly harmony_decode_counts: (a: number, b: number) => [number, number, number, number];
    readonly mergeDelta: (a: number, b: number, c: number) => [number, number, number];
    readonly planRounds: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly readVarint: (a: number, b: number, c: number) => [number, number];
    readonly splitmix64: (a: number, b: number) => [number, number];
    readonly verifyAnnounceResponse: (a: number, b: number) => [number, number, number];
    readonly verifyBucketMerkleItem: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly verifyDatabaseProofResponse: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number, number];
    readonly verifyDatabaseProofV2Response: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number, number];
    readonly verifyRawSnpReport: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly wasmannounceverification_binarySha256Hex: (a: number) => [number, number];
    readonly wasmannounceverification_chainError: (a: number) => [number, number];
    readonly wasmannounceverification_chainVerified: (a: number) => number;
    readonly wasmannounceverification_channelPub: (a: number) => any;
    readonly wasmannounceverification_channelPubHex: (a: number) => [number, number];
    readonly wasmannounceverification_checkChannelBinding: (a: number, b: number, c: number) => [number, number];
    readonly wasmannounceverification_checkFreshness: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmannounceverification_checkPinnedOperator: (a: number, b: number, c: number, d: bigint) => [number, number];
    readonly wasmannounceverification_gitRev: (a: number) => [number, number];
    readonly wasmannounceverification_identityPubkeyHex: (a: number) => [number, number];
    readonly wasmannounceverification_issuedAt: (a: number) => bigint;
    readonly wasmannounceverification_operatorPubkeyHex: (a: number) => [number, number];
    readonly wasmannounceverification_serverId: (a: number) => [number, number];
    readonly wasmannounceverification_validFrom: (a: number) => bigint;
    readonly wasmannounceverification_validUntil: (a: number) => bigint;
    readonly wasmarccredential_epoch: (a: number) => number;
    readonly wasmarccredential_new: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly wasmarccredential_nextNonce: (a: number) => number;
    readonly wasmarccredential_present: (a: number, b: number) => [number, number, number, number];
    readonly wasmarccredential_presentationLimit: (a: number) => number;
    readonly wasmarccredential_remaining: (a: number) => number;
    readonly wasmarccredentialrequest_epoch: (a: number) => number;
    readonly wasmarccredentialrequest_finalize: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly wasmarccredentialrequest_fromBytes: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly wasmarccredentialrequest_new: (a: number) => [number, number, number];
    readonly wasmarccredentialrequest_requestBytes: (a: number) => [number, number];
    readonly wasmarccredentialrequest_secretsBytes: (a: number) => [number, number];
    readonly wasmatomicmetrics_new: () => number;
    readonly wasmatomicmetrics_snapshot: (a: number) => any;
    readonly wasmattestverification_arkPem: (a: number) => any;
    readonly wasmattestverification_askPem: (a: number) => any;
    readonly wasmattestverification_binarySha256Hex: (a: number) => [number, number];
    readonly wasmattestverification_expectedReportDataHashHex: (a: number) => [number, number];
    readonly wasmattestverification_gitRev: (a: number) => [number, number];
    readonly wasmattestverification_hasVcekChain: (a: number) => number;
    readonly wasmattestverification_launchMeasurementHex: (a: number) => [number, number];
    readonly wasmattestverification_manifestRootsHex: (a: number) => any;
    readonly wasmattestverification_nonceHex: (a: number) => [number, number];
    readonly wasmattestverification_serverStaticPub: (a: number) => any;
    readonly wasmattestverification_serverStaticPubHex: (a: number) => [number, number];
    readonly wasmattestverification_sevSnpReport: (a: number) => any;
    readonly wasmattestverification_sevStatus: (a: number) => [number, number];
    readonly wasmattestverification_vcekPem: (a: number) => any;
    readonly wasmattestverification_verifyFull: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasmattestverification_verifyVcekChain: (a: number, b: number, c: number) => [number, number];
    readonly wasmbucketmerkletreetops_cacheFromLevel: (a: number, b: number) => number;
    readonly wasmbucketmerkletreetops_fromBytes: (a: number, b: number) => [number, number, number];
    readonly wasmbucketmerkletreetops_root: (a: number, b: number) => [number, number];
    readonly wasmbucketmerkletreetops_treeCount: (a: number) => number;
    readonly wasmdatabasecatalog_count: (a: number) => number;
    readonly wasmdatabasecatalog_fromJson: (a: any) => [number, number, number];
    readonly wasmdatabasecatalog_getDatabase: (a: number, b: number) => any;
    readonly wasmdatabasecatalog_getEntry: (a: number, b: number) => any;
    readonly wasmdatabasecatalog_hasBucketMerkle: (a: number, b: number) => number;
    readonly wasmdatabasecatalog_latestTip: (a: number) => number;
    readonly wasmdatabasecatalog_new: () => number;
    readonly wasmdatabasecatalog_toJson: (a: number) => any;
    readonly wasmdatabaseproof_blockHashHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_bucketSuperRootHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_buildKind: (a: number) => [number, number];
    readonly wasmdatabaseproof_builderBinarySha256Hex: (a: number) => [number, number];
    readonly wasmdatabaseproof_builderGitCommit: (a: number) => [number, number];
    readonly wasmdatabaseproof_dbId: (a: number) => number;
    readonly wasmdatabaseproof_fromBlockHashHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_fromHeight: (a: number) => number;
    readonly wasmdatabaseproof_height: (a: number) => number;
    readonly wasmdatabaseproof_manifestRootHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_muhashHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_networkMagicHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_onionChunkBinsPerTable: (a: number) => number;
    readonly wasmdatabaseproof_onionEntrySize: (a: number) => number;
    readonly wasmdatabaseproof_onionIndexBinsPerTable: (a: number) => number;
    readonly wasmdatabaseproof_onionIndexSlotSize: (a: number) => number;
    readonly wasmdatabaseproof_onionIndexSlotsPerBin: (a: number) => number;
    readonly wasmdatabaseproof_onionSuperRootHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_onionTotalPackedEntries: (a: number) => number;
    readonly wasmdatabaseproof_paramsHashHex: (a: number) => [number, number];
    readonly wasmdatabaseproof_proofVersion: (a: number) => number;
    readonly wasmdatabaseproof_toJson: (a: number) => any;
    readonly wasmdpfclient_announce: (a: number, b: number) => any;
    readonly wasmdpfclient_attest: (a: number, b: number) => any;
    readonly wasmdpfclient_clearMetricsRecorder: (a: number) => void;
    readonly wasmdpfclient_connect: (a: number) => any;
    readonly wasmdpfclient_connectServer: (a: number, b: number) => any;
    readonly wasmdpfclient_disconnect: (a: number) => any;
    readonly wasmdpfclient_disconnectServer: (a: number, b: number) => any;
    readonly wasmdpfclient_enableCredits: (a: number, b: number, c: any) => any;
    readonly wasmdpfclient_fetchCatalog: (a: number) => any;
    readonly wasmdpfclient_fetchCatalogFromServer: (a: number, b: number) => any;
    readonly wasmdpfclient_installVerifiedDatabaseProof: (a: number, b: number) => [number, number];
    readonly wasmdpfclient_isConnected: (a: number) => number;
    readonly wasmdpfclient_isServerConnected: (a: number, b: number) => [number, number, number];
    readonly wasmdpfclient_new: (a: number, b: number, c: number, d: number) => number;
    readonly wasmdpfclient_onStateChange: (a: number, b: any) => void;
    readonly wasmdpfclient_preflightDatabase: (a: number, b: number) => any;
    readonly wasmdpfclient_presentCredits: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasmdpfclient_queryBatch: (a: number, b: any, c: number) => any;
    readonly wasmdpfclient_queryBatchVerified: (a: number, b: any, c: number) => any;
    readonly wasmdpfclient_serverUrls: (a: number) => any;
    readonly wasmdpfclient_setMetricsRecorder: (a: number, b: number) => void;
    readonly wasmdpfclient_setRequireVerifiedDatabaseRoots: (a: number, b: number) => void;
    readonly wasmdpfclient_setServerUrl: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasmdpfclient_sync: (a: number, b: any, c: number) => any;
    readonly wasmdpfclient_syncWithProgress: (a: number, b: any, c: number, d: any) => any;
    readonly wasmdpfclient_upgradeServerToSecureChannel: (a: number, b: number, c: number, d: number) => any;
    readonly wasmdpfclient_upgradeToSecureChannel: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasmdpfclient_verifyDatabaseProof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
    readonly wasmdpfclient_verifyDatabaseProofFromServer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
    readonly wasmharmonyclient_announce: (a: number, b: number) => any;
    readonly wasmharmonyclient_attest: (a: number, b: number) => any;
    readonly wasmharmonyclient_cacheMasterKey: (a: number) => any;
    readonly wasmharmonyclient_cachePrpBackend: (a: number) => number;
    readonly wasmharmonyclient_clearMetricsRecorder: (a: number) => void;
    readonly wasmharmonyclient_connect: (a: number) => any;
    readonly wasmharmonyclient_connectProvider: (a: number, b: number) => any;
    readonly wasmharmonyclient_dbId: (a: number) => number;
    readonly wasmharmonyclient_disconnect: (a: number) => any;
    readonly wasmharmonyclient_disconnectProvider: (a: number, b: number) => any;
    readonly wasmharmonyclient_enableCredits: (a: number, b: number, c: any) => any;
    readonly wasmharmonyclient_estimateHintSizeBytes: (a: number) => number;
    readonly wasmharmonyclient_fetchCatalog: (a: number) => any;
    readonly wasmharmonyclient_fetchCatalogFromProvider: (a: number, b: number) => any;
    readonly wasmharmonyclient_fetchCompleteHintsWithProgress: (a: number, b: number, c: number, d: any) => any;
    readonly wasmharmonyclient_fetchHintsWithProgress: (a: number, b: number, c: number, d: any) => any;
    readonly wasmharmonyclient_fingerprint: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmharmonyclient_hasCompleteHints: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmharmonyclient_installVerifiedDatabaseProof: (a: number, b: number) => [number, number];
    readonly wasmharmonyclient_isConnected: (a: number) => number;
    readonly wasmharmonyclient_isProviderConnected: (a: number, b: number) => [number, number, number];
    readonly wasmharmonyclient_loadCompleteHints: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmharmonyclient_loadHints: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmharmonyclient_minQueriesRemaining: (a: number) => number;
    readonly wasmharmonyclient_new: (a: number, b: number, c: number, d: number) => number;
    readonly wasmharmonyclient_onStateChange: (a: number, b: any) => void;
    readonly wasmharmonyclient_preflightDatabase: (a: number, b: number) => any;
    readonly wasmharmonyclient_presentCredits: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasmharmonyclient_queryBatch: (a: number, b: any, c: number) => any;
    readonly wasmharmonyclient_queryBatchVerified: (a: number, b: any, c: number) => any;
    readonly wasmharmonyclient_saveHints: (a: number) => [number, number, number];
    readonly wasmharmonyclient_serverUrls: (a: number) => any;
    readonly wasmharmonyclient_setDbId: (a: number, b: number) => void;
    readonly wasmharmonyclient_setMasterKey: (a: number, b: number, c: number) => [number, number];
    readonly wasmharmonyclient_setMetricsRecorder: (a: number, b: number) => void;
    readonly wasmharmonyclient_setProviderUrl: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasmharmonyclient_setPrpBackend: (a: number, b: number) => [number, number];
    readonly wasmharmonyclient_setRequireVerifiedDatabaseRoots: (a: number, b: number) => void;
    readonly wasmharmonyclient_sync: (a: number, b: any, c: number) => any;
    readonly wasmharmonyclient_syncWithProgress: (a: number, b: any, c: number, d: any) => any;
    readonly wasmharmonyclient_upgradeProviderToSecureChannel: (a: number, b: number, c: number, d: number) => any;
    readonly wasmharmonyclient_upgradeToSecureChannel: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasmharmonyclient_verifyDatabaseProof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
    readonly wasmharmonyclient_verifyDatabaseProofFromProvider: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
    readonly wasmoramclient_announce: (a: number) => any;
    readonly wasmoramclient_attest: (a: number) => any;
    readonly wasmoramclient_clearMetricsRecorder: (a: number) => void;
    readonly wasmoramclient_connect: (a: number) => any;
    readonly wasmoramclient_disconnect: (a: number) => any;
    readonly wasmoramclient_enableCredits: (a: number, b: any) => any;
    readonly wasmoramclient_fetchCatalog: (a: number) => any;
    readonly wasmoramclient_installVerifiedDatabaseProof: (a: number, b: number) => [number, number];
    readonly wasmoramclient_isConnected: (a: number) => number;
    readonly wasmoramclient_new: (a: number, b: number) => number;
    readonly wasmoramclient_presentCredits: (a: number, b: number, c: number, d: number) => any;
    readonly wasmoramclient_queryBatch: (a: number, b: any, c: number) => any;
    readonly wasmoramclient_queryBatchPadded: (a: number, b: any, c: number, d: number) => any;
    readonly wasmoramclient_serverUrl: (a: number) => [number, number];
    readonly wasmoramclient_setMetricsRecorder: (a: number, b: number) => void;
    readonly wasmoramclient_setRequireVerifiedDatabaseRoots: (a: number, b: number) => void;
    readonly wasmoramclient_upgradeToSecureChannel: (a: number, b: number, c: number) => any;
    readonly wasmoramclient_verifyDatabaseProof: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
    readonly wasmpolicyrequirements_new: () => number;
    readonly wasmpolicyrequirements_setAllowDebug: (a: number, b: number) => void;
    readonly wasmpolicyrequirements_setAllowMigrateMa: (a: number, b: number) => void;
    readonly wasmpolicyrequirements_setExpectedFamilyId: (a: number, b: number, c: number) => [number, number];
    readonly wasmpolicyrequirements_setExpectedImageId: (a: number, b: number, c: number) => [number, number];
    readonly wasmpolicyrequirements_setExpectedMeasurement: (a: number, b: number, c: number) => [number, number];
    readonly wasmpolicyrequirements_setMaxVmpl: (a: number, b: number) => void;
    readonly wasmpolicyrequirements_setRequireSingleSocket: (a: number, b: number) => void;
    readonly wasmqueryresult_chunkBins: (a: number) => any;
    readonly wasmqueryresult_entryCount: (a: number) => number;
    readonly wasmqueryresult_fromJson: (a: any) => [number, number, number];
    readonly wasmqueryresult_getEntry: (a: number, b: number) => any;
    readonly wasmqueryresult_indexBins: (a: number) => any;
    readonly wasmqueryresult_isWhale: (a: number) => number;
    readonly wasmqueryresult_matchedIndexIdx: (a: number) => any;
    readonly wasmqueryresult_merkleVerified: (a: number) => number;
    readonly wasmqueryresult_new: () => number;
    readonly wasmqueryresult_rawChunkData: (a: number) => any;
    readonly wasmqueryresult_toJson: (a: number) => any;
    readonly wasmqueryresult_totalBalance: (a: number) => bigint;
    readonly wasmstandalonesecurechannelv1_attestRequest: (a: number) => [number, number];
    readonly wasmstandalonesecurechannelv1_completeHandshake: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmstandalonesecurechannelv1_established: (a: number) => number;
    readonly wasmstandalonesecurechannelv1_handshakeRequest: (a: number) => [number, number, number, number];
    readonly wasmstandalonesecurechannelv1_new: () => [number, number, number];
    readonly wasmstandalonesecurechannelv1_openFrame: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmstandalonesecurechannelv1_sealFrame: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmstandalonesecurechannelv1_serviceAuthorizationExporterV1: (a: number) => [number, number, number];
    readonly wasmstandalonesecurechannelv1_verifyAttestation: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmsyncplan_getStep: (a: number, b: number) => any;
    readonly wasmsyncplan_isEmpty: (a: number) => number;
    readonly wasmsyncplan_isFreshSync: (a: number) => number;
    readonly wasmsyncplan_stepsCount: (a: number) => number;
    readonly wasmsyncplan_targetHeight: (a: number) => number;
    readonly wasmsyncplan_toJson: (a: number) => any;
    readonly wasmsyncresult_getResult: (a: number, b: number) => number;
    readonly wasmsyncresult_resultCount: (a: number) => number;
    readonly wasmsyncresult_toJson: (a: number) => any;
    readonly xorBuffers: (a: number, b: number, c: number, d: number) => [number, number];
    readonly __wasm_init: () => void;
    readonly initTracingSubscriber: () => void;
    readonly turinArkFingerprint: () => any;
    readonly wasmsyncresult_syncedHeight: (a: number) => number;
    readonly wasmsyncresult_wasFreshSync: (a: number) => number;
    readonly wasm_bindgen__closure__destroy__h490263039c0c107c: (a: number, b: number) => void;
    readonly wasm_bindgen__closure__destroy__h13a6b95fd26262cb: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h9bbb2438131d711c: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h1227e1e7bfd44bf9: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_2: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_3: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__hc39032372d75848d: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
