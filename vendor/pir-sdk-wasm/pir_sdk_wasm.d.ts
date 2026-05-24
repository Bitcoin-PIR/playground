/* tslint:disable */
/* eslint-disable */

/**
 * Pair of recovered DB rows produced by
 * [`HarmonyGroup::process_response_pair`].
 *
 * wasm-bindgen doesn't accept tuple returns; this struct is the
 * transport. Use the `answer_1` / `answer_2` getters from JS, or
 * `into_parts()` on the Rust side.
 */
export class HarmonyAnswerPair {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly answer_1: Uint8Array;
    readonly answer_2: Uint8Array;
}

/**
 * Per-PBC-group HarmonyPIR client state.
 */
export class HarmonyGroup {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Build a dummy request for a group the client doesn't actually need.
     *
     * Picks a random bin in `[0, real_n)` and builds a real-looking request.
     * The client discards the server's response — **no `process_response`
     * call, no hint consumed, no relocation**.
     *
     * The Query Server cannot distinguish this from a real request because it
     * does not know the PRP key — it just sees sorted indices into the table.
     *
     * # TODO (privacy)
     *
     * The count of non-empty indices per segment follows a distribution that
     * depends on T and N.  A truly indistinguishable dummy would need to sample
     * from that same distribution (~Binomial(T, 0.5)) rather than using an
     * actual segment.  For now we query a random real bin, which produces a
     * realistic but not perfectly simulated count.  This must be revisited
     * before production — see the protocol's privacy analysis.
     */
    build_dummy_request(): HarmonyRequest;
    /**
     * Build a request for database row `q`.
     *
     * Emits exactly `T - 1` sorted distinct u32 indices drawn from
     * `[0, real_n)`.  Real non-empty segment cells contribute their
     * actual DB index; empty slots are padded with fresh random
     * indices (distinct from each other and from the real indices).
     * The dummy indices are tracked in `last_is_dummy` so that
     * `process_response` can XOR-cancel their server responses out
     * of the recovered row.
     *
     * Fixed-count invariant: every call emits `(T - 1) * 4` bytes,
     * regardless of segment state, query count, or round.  See
     * `PLAN_HARMONY_COUNT_LEAK_FIX.md` and the "HarmonyPIR Per-Group
     * Request-Count Symmetry" section of `CLAUDE.md` — do NOT change
     * this to a variable count.
     */
    build_request(q: number): HarmonyRequest;
    /**
     * Build BOTH server requests for a pipelined pair query.
     *
     * This is the wrapper-side mirror of upstream
     * `harmonypir::Client::build_pair_requests` (see
     * `bitcoin-pir/harmonypir/src/protocol.rs`), adapted to the
     * privacy-padded wire format. It constructs requests for both
     * `q_1` and `q_2` and advances DS' past q_1's relocation, but
     * does NOT touch the hint parities. The caller then sends both
     * requests over the network (in parallel, ideally) and feeds
     * both responses to [`Self::process_response_pair`].
     *
     * # Output
     *
     * Two [`HarmonyRequest`]s, each independently emitting exactly
     * `(T - 1) * 4` bytes (the per-group request-count symmetry
     * invariant — see `PLAN_HARMONY_COUNT_LEAK_FIX.md`). The
     * in-flight state is stashed on the group as
     * `Option<PendingPair>` and consumed by
     * `process_response_pair`.
     *
     * # In-flight invariant
     *
     * Between this call and `process_response_pair`, the group is
     * in an in-flight state — DS' is one segment ahead of H. All
     * other mutating methods (`build_request`, `build_dummy_request`,
     * `process_response`, `process_response_xor_only`,
     * `finish_relocation`, `load_hints`, and a second
     * `build_request_pair`) reject calls with an error until
     * `process_response_pair` returns. `build_synthetic_dummy` is
     * safe to call (it only advances the RNG).
     *
     * # Equivalence
     *
     * `build_request_pair(q_1, q_2)` followed by
     * `process_response_pair(...)` produces the same final group
     * state and the same answers as two sequential
     * `build_request(q_1) + process_response(...)` then
     * `build_request(q_2) + process_response(...)` calls with the
     * same RNG seed (see `test_split_pair_api_*` and
     * `test_query_pair_equiv_sequential_*` below). Mirrors the
     * upstream eight-step soundness argument; the only differences
     * are wire format (sorted padded indices) and the answer
     * formula (XOR of REAL entries, dummies cancelled by
     * exclusion).
     */
    build_request_pair(q_1: number, q_2: number): HarmonyRequestPair;
    /**
     * Build a **synthetic** dummy request that is byte-for-byte
     * indistinguishable on the wire from a real `build_request`.
     *
     * Emits exactly `T - 1` sorted distinct u32 indices drawn
     * uniformly at random from `[0, real_n)` — the same fixed count
     * that `build_request` produces after padding.  Because the
     * count is deterministic, the server cannot tell synthetic
     * dummies apart from real queries, nor can it tell real queries
     * with many empty segment cells apart from real queries with
     * few.  See `PLAN_HARMONY_COUNT_LEAK_FIX.md`.
     *
     * Returns raw bytes: `(T - 1) × 4B u32 LE` (same format as
     * `HarmonyRequest.request`).
     *
     * **No state mutation**: hints, DS', query count, and
     * RNG-derived segment state are untouched.  (The RNG *is*
     * advanced, which is fine.)
     */
    build_synthetic_dummy(): Uint8Array;
    /**
     * Restore a group from serialized bytes.
     *
     * Reconstructs the PRP from key + params (+ cache for FastPRP),
     * creates a fresh DS', then replays all relocated segments to
     * restore the exact same DS' state.
     */
    static deserialize(data: Uint8Array, prp_key: Uint8Array, group_id: number): HarmonyGroup;
    /**
     * Complete the deferred relocation from a prior `process_response_xor_only` call.
     */
    finish_relocation(): void;
    /**
     * Load pre-computed hint parities (M × w bytes, flat).
     */
    load_hints(hints_data: Uint8Array): void;
    m(): number;
    max_queries(): number;
    /**
     * Padded N (PRP domain = 2*padded_n). Always >= real_n.
     */
    n(): number;
    /**
     * Create a new HarmonyGroup with HMR12 PRP (default).
     */
    constructor(n: number, w: number, t: number, prp_key: Uint8Array, group_id: number);
    /**
     * Create with a specific PRP backend.
     *
     * `n` is the real number of DB rows. Internally, N is padded up so
     * that `2*padded_n % T == 0`. Rows in `[n, padded_n)` are virtual
     * empty rows (the server returns zeros for them).
     */
    static new_with_backend(n: number, w: number, t: number, prp_key: Uint8Array, group_id: number, prp_backend: number): HarmonyGroup;
    /**
     * Process the Query Server's response and recover the target entry.
     *
     * Response contains exactly `T - 1` entries of w bytes each, in
     * the same sorted order as the padded request indices.  Dummy
     * slots (tracked in `last_is_dummy`) are XOR-cancelled out of
     * the final answer so only real segment entries contribute:
     * `answer = H[s] ⊕ XOR(entries[i] for i where !last_is_dummy[i])`.
     */
    process_response(response: Uint8Array): Uint8Array;
    /**
     * Finish a pipelined pair query: compute both answers and complete
     * state updates.
     *
     * Consumes the in-flight `PendingPair` produced by
     * `build_request_pair` along with the two server responses. Each
     * response must be exactly `(T - 1) * w` bytes, matching the
     * sorted-padded request length.
     *
     * On success, `H` and DS' are advanced as if two sequential
     * `process_response` calls had completed (`query_count += 2`,
     * `relocated_segments` extended with `[s_1, s_2]`).
     *
     * On a wrong-length response error, the in-flight state is
     * already taken — the group is no longer pair-in-flight, but
     * q_1's relocation has been committed to DS' (matching upstream
     * `finish_pair` failure semantics: errored pair leaves the
     * client in a degraded but recoverable state).
     */
    process_response_pair(response_1: Uint8Array, response_2: Uint8Array): HarmonyAnswerPair;
    /**
     * Fast path: recover the answer via XOR only, deferring relocation.
     *
     * Call `finish_relocation()` before the next query on this group.
     */
    process_response_xor_only(response: Uint8Array): Uint8Array;
    prp_backend(): number;
    queries_remaining(): number;
    queries_used(): number;
    /**
     * Original (unpadded) N — the actual number of DB rows.
     */
    real_n(): number;
    /**
     * Serialize this group's full mutable state to bytes.
     *
     * Format:
     * ```text
     * [4B padded_n][4B w][4B t][4B query_count][1B prp_backend][4B real_n]
     * [4B num_relocated][num_relocated × 4B segments]
     * [4B prp_cache_len][prp_cache bytes]
     * [M × w bytes: hints]
     * ```
     *
     * **Pre-condition:** no pipelined pair query is in flight. Calling
     * `serialize()` while `pending_pair.is_some()` would persist a
     * state where DS' is one segment ahead of H — `deserialize` cannot
     * recover that intermediate state because the pending pair's
     * pre-update H[s_2] and the cached d_1 are round-local scratch.
     * Callers must complete (or abandon and reconstruct) the pair
     * first. Asserted in debug builds; in release builds the contract
     * is documented but not enforced (the resulting bytes are
     * well-formed but reflect a corrupted state).
     */
    serialize(): Uint8Array;
    t(): number;
    w(): number;
}

export class HarmonyRequest {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly position: number;
    readonly query_index: number;
    readonly request: Uint8Array;
    readonly segment: number;
}

/**
 * Pair of [`HarmonyRequest`]s produced by
 * [`HarmonyGroup::build_request_pair`].
 *
 * wasm-bindgen doesn't accept tuple returns; this struct is the
 * transport. Use the `request_1` / `request_2` getters from JS or
 * destructure on the Rust side via `pair.into_parts()`.
 */
export class HarmonyRequestPair {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly request_1: HarmonyRequest;
    readonly request_2: HarmonyRequest;
}

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
 * Opaque handle wrapping an ARC `PresentationState` + `Credential`.
 *
 * The credential is obtained from the payment service as a byte blob
 * (see `from_credential_bytes`). The presentation state is created
 * client-side with a `presentation_context` (typically a random session
 * nonce) and a `limit` (the max number of queries this credential allows).
 *
 * Each call to `present()` bumps the internal nonce counter and returns
 * the wire-format presentation bytes to send to the server via
 * `REQ_CREDENTIAL_PRESENT`.
 */
export class WasmArcPresentationState {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Deserialize state previously produced by `serialize()`.
     */
    static deserialize(bytes: Uint8Array): WasmArcPresentationState;
    /**
     * The presentation limit for this credential.
     */
    limit(): bigint;
    /**
     * Deserialize a credential (received from the payment service) and
     * initialize presentation state.
     *
     * `credential_bytes`: 131-byte blob encoding `(m1: 32B, u: 33B, u_prime: 33B, x1: 33B)`.
     * `presentation_context`: arbitrary bytes scoping the tag namespace (e.g., a fresh random 32B session ID).
     * `limit`: maximum number of queries this credential authorizes.
     */
    constructor(credential_bytes: Uint8Array, presentation_context: Uint8Array, limit: bigint);
    /**
     * The current nonce (how many presentations already made).
     */
    nonce(): bigint;
    /**
     * Produce the next presentation.
     *
     * Returns the wire-format presentation bytes (to send to the server in
     * `REQ_CREDENTIAL_PRESENT`), or throws if the credential is exhausted.
     */
    present(): Uint8Array;
    /**
     * How many presentations remain before exhaustion.
     */
    remaining(): bigint;
    /**
     * Serialize the full state for persistence (e.g., localStorage).
     *
     * Format: `[credential: 131B][pres_ctx_len: 4B LE][pres_ctx][next_nonce: 8B LE][limit: 8B LE]`
     */
    serialize(): Uint8Array;
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
     * The JS-side callers check this before enabling the standalone
     * Merkle verifier path — `verify_merkle_batch_for_results` on the
     * native side does the same check internally, but the flag is
     * useful for UI surfaces that want to show a "verified" badge
     * only when verification actually ran.
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
     * Close both WebSocket connections. After this the client returns
     * `isConnected === false` and `connect` must be called before the
     * next query.
     */
    disconnect(): Promise<void>;
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
     * Inspector-path batch query — like [`queryBatch`](Self::query_batch)
     * but returns opaque [`WasmQueryResult`] handles whose
     * `indexBins`/`chunkBins`/`matchedIndexIdx` accessors are populated,
     * and whose per-query Merkle verification has been **skipped**.
     *
     * This is the pair-wise half of the split-verify flow: call this,
     * persist or inspect the results, then later call
     * [`verifyMerkleBatch`](Self::verify_merkle_batch) against the same
     * `db_id` to obtain the per-query verdicts.
     *
     * Returns a JS `Array` of length `N` (the input scripthash count).
     * Every slot is a non-null [`WasmQueryResult`] — not-found queries
     * are synthesised as empty inspector-populated results so the
     * absence-proof bins are preserved for verification.
     *
     * 🔒 Padding invariants are preserved (K=75 INDEX / K_CHUNK=80
     * CHUNK groups), including when most queries are not-found — the
     * wire-level batch is unchanged.
     */
    queryBatchRaw(script_hashes: Uint8Array, db_id: number): Promise<any>;
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
     * Standalone Merkle verifier — consumes inspector-populated
     * QueryResults (as JSON, typically produced by
     * [`queryBatchRaw`](Self::query_batch_raw) then
     * `WasmQueryResult.toJson()` and possibly round-tripped through
     * persistent storage) and returns one `bool` per input.
     *
     * # Arguments
     * * `results_json` — JS `Array` where each element is either `null`
     *   (caller had nothing to verify for that slot — always returns
     *   `true`) or a `QueryResult` JSON object including `indexBins` /
     *   `chunkBins` / `matchedIndexIdx`.
     * * `db_id` — database to verify against.
     *
     * # Returns
     * JS `Array` of `bool`:
     * * `true`  — all attached Merkle items verified, or nothing to
     *   verify at this slot.
     * * `false` — at least one Merkle proof failed; callers should
     *   treat the slot as untrusted.
     *
     * Databases that don't publish a bucket-Merkle tree are accepted
     * trivially (every slot returns `true`).
     */
    verifyMerkleBatch(results_json: any, db_id: number): Promise<any>;
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
     * Uninstall the currently-registered metrics recorder. See
     * [`WasmDpfClient::clear_metrics_recorder`].
     */
    clearMetricsRecorder(): void;
    /**
     * Open WebSocket connections to both hint and query servers.
     */
    connect(): Promise<void>;
    /**
     * Get the currently-loaded `db_id`, or `null` if no hints are
     * loaded. See [`HarmonyClient::db_id`] for semantics.
     */
    dbId(): number | undefined;
    /**
     * Close both WebSocket connections.
     */
    disconnect(): Promise<void>;
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
     * Low-level: query a single database by `db_id`. See
     * [`WasmDpfClient::query_batch`].
     */
    queryBatch(script_hashes: Uint8Array, db_id: number): Promise<any>;
    /**
     * Inspector-path batch query — like [`queryBatch`](Self::query_batch)
     * but returns opaque [`WasmQueryResult`] handles whose
     * `indexBins`/`chunkBins`/`matchedIndexIdx` accessors are populated,
     * and whose per-query Merkle verification has been **skipped**.
     *
     * See [`WasmDpfClient::query_batch_raw`] for the full split-verify
     * flow description. The Harmony wrapper exposes the same JS-facing
     * contract despite the different wire protocol underneath.
     *
     * 🔒 Padding invariants are preserved (K=75 INDEX / K_CHUNK=80
     * CHUNK groups) — padding lives in the native `HarmonyClient` query
     * path that this wrapper delegates to.
     */
    queryBatchRaw(script_hashes: Uint8Array, db_id: number): Promise<any>;
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
     * `sync`/`queryBatch`/`queryBatchRaw` will re-fetch (or restore
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
    /**
     * Wrap both server connections (hint + query) with the encrypted
     * channel transport. See [`WasmDpfClient::upgrade_to_secure_channel`]
     * — same eph_seed caching + binding flow. Argument order matches
     * `serverUrls()` — `(hint, query)`.
     */
    upgradeToSecureChannel(hint_server_static_pub: Uint8Array, query_server_static_pub: Uint8Array): Promise<void>;
    /**
     * Standalone Merkle verifier over inspector-populated QueryResults.
     * See [`WasmDpfClient::verify_merkle_batch`] for the full argument
     * / return contract — the Harmony implementation uses the same
     * per-bucket machinery via the `HarmonySiblingQuerier` transport
     * path, so the JS-facing behaviour is identical.
     */
    verifyMerkleBatch(results_json: any, db_id: number): Promise<any>;
    /**
     * True while both connections are live.
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
     * Create from JSON.
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
     * (e.g. `WasmDpfClient.queryBatchRaw`). Populated for found,
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
     * Create an empty result.
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
     * Populated natively by
     * `pir-sdk-client::DpfClient::query_batch_with_inspector`
     * (when `db_info.kind.is_delta()`) and surfaced here as a
     * `Uint8Array`. This getter is the only way the web client can
     * obtain the bytes — `toJson()` emits them as a hex string so that
     * persisted results also carry the delta payload across reloads.
     */
    rawChunkData(): any;
    /**
     * Convert to JSON.
     *
     * The emitted object is accepted by [`fromJson`] as a round-trip
     * input — including optional inspector fields (`indexBins`,
     * `chunkBins`, `matchedIndexIdx`), which lets callers persist an
     * inspector-path result (e.g. to localStorage) and later re-verify
     * it via `WasmDpfClient.verifyMerkleBatch`.
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
     * Whether the per-bucket Merkle proof verified for this result.
     *
     * `true` means the proof passed or the database doesn't publish
     * Merkle commitments (no failure detected). `false` means
     * verification was attempted and FAILED; the result should be
     * treated as untrusted.
     */
    readonly merkleVerified: boolean;
    /**
     * Total balance in satoshis.
     */
    readonly totalBalance: bigint;
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
     * Convert the full sync result to a plain JSON object.
     *
     * Shape:
     * ```json
     * {
     *   "results": [
     *     null,
     *     { "entries": [...], "isWhale": false,
     *       "totalBalance": 0, "merkleVerified": true }
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

export function compute_balanced_t(n: number): number;

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
 * A new WasmQueryResult with the delta applied.
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

export function verify_protocol(n: number, w: number): boolean;

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
    readonly __wbg_wasmarcpresentationstate_free: (a: number, b: number) => void;
    readonly __wbg_wasmatomicmetrics_free: (a: number, b: number) => void;
    readonly __wbg_wasmattestverification_free: (a: number, b: number) => void;
    readonly __wbg_wasmbucketmerkletreetops_free: (a: number, b: number) => void;
    readonly __wbg_wasmdatabasecatalog_free: (a: number, b: number) => void;
    readonly __wbg_wasmdpfclient_free: (a: number, b: number) => void;
    readonly __wbg_wasmharmonyclient_free: (a: number, b: number) => void;
    readonly __wbg_wasmpolicyrequirements_free: (a: number, b: number) => void;
    readonly __wbg_wasmqueryresult_free: (a: number, b: number) => void;
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
    readonly verifyBucketMerkleItem: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmannounceverification_binarySha256Hex: (a: number) => [number, number];
    readonly wasmannounceverification_chainError: (a: number) => [number, number];
    readonly wasmannounceverification_chainVerified: (a: number) => number;
    readonly wasmannounceverification_channelPub: (a: number) => any;
    readonly wasmannounceverification_channelPubHex: (a: number) => [number, number];
    readonly wasmannounceverification_gitRev: (a: number) => [number, number];
    readonly wasmannounceverification_identityPubkeyHex: (a: number) => [number, number];
    readonly wasmannounceverification_issuedAt: (a: number) => bigint;
    readonly wasmannounceverification_operatorPubkeyHex: (a: number) => [number, number];
    readonly wasmannounceverification_serverId: (a: number) => [number, number];
    readonly wasmannounceverification_validFrom: (a: number) => bigint;
    readonly wasmannounceverification_validUntil: (a: number) => bigint;
    readonly wasmarcpresentationstate_deserialize: (a: number, b: number) => [number, number, number];
    readonly wasmarcpresentationstate_limit: (a: number) => bigint;
    readonly wasmarcpresentationstate_new: (a: number, b: number, c: number, d: number, e: bigint) => [number, number, number];
    readonly wasmarcpresentationstate_present: (a: number) => [number, number, number, number];
    readonly wasmarcpresentationstate_remaining: (a: number) => bigint;
    readonly wasmarcpresentationstate_serialize: (a: number) => [number, number];
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
    readonly wasmdpfclient_announce: (a: number, b: number) => any;
    readonly wasmdpfclient_attest: (a: number, b: number) => any;
    readonly wasmdpfclient_clearMetricsRecorder: (a: number) => void;
    readonly wasmdpfclient_connect: (a: number) => any;
    readonly wasmdpfclient_disconnect: (a: number) => any;
    readonly wasmdpfclient_fetchCatalog: (a: number) => any;
    readonly wasmdpfclient_isConnected: (a: number) => number;
    readonly wasmdpfclient_new: (a: number, b: number, c: number, d: number) => number;
    readonly wasmdpfclient_onStateChange: (a: number, b: any) => void;
    readonly wasmdpfclient_queryBatch: (a: number, b: any, c: number) => any;
    readonly wasmdpfclient_queryBatchRaw: (a: number, b: any, c: number) => any;
    readonly wasmdpfclient_serverUrls: (a: number) => any;
    readonly wasmdpfclient_setMetricsRecorder: (a: number, b: number) => void;
    readonly wasmdpfclient_sync: (a: number, b: any, c: number) => any;
    readonly wasmdpfclient_syncWithProgress: (a: number, b: any, c: number, d: any) => any;
    readonly wasmdpfclient_upgradeToSecureChannel: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasmdpfclient_verifyMerkleBatch: (a: number, b: any, c: number) => any;
    readonly wasmharmonyclient_announce: (a: number, b: number) => any;
    readonly wasmharmonyclient_attest: (a: number, b: number) => any;
    readonly wasmharmonyclient_clearMetricsRecorder: (a: number) => void;
    readonly wasmharmonyclient_connect: (a: number) => any;
    readonly wasmharmonyclient_dbId: (a: number) => number;
    readonly wasmharmonyclient_disconnect: (a: number) => any;
    readonly wasmharmonyclient_estimateHintSizeBytes: (a: number) => number;
    readonly wasmharmonyclient_fetchCatalog: (a: number) => any;
    readonly wasmharmonyclient_fetchHintsWithProgress: (a: number, b: number, c: number, d: any) => any;
    readonly wasmharmonyclient_fingerprint: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmharmonyclient_isConnected: (a: number) => number;
    readonly wasmharmonyclient_loadHints: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmharmonyclient_minQueriesRemaining: (a: number) => number;
    readonly wasmharmonyclient_new: (a: number, b: number, c: number, d: number) => number;
    readonly wasmharmonyclient_onStateChange: (a: number, b: any) => void;
    readonly wasmharmonyclient_queryBatch: (a: number, b: any, c: number) => any;
    readonly wasmharmonyclient_queryBatchRaw: (a: number, b: any, c: number) => any;
    readonly wasmharmonyclient_saveHints: (a: number) => [number, number, number];
    readonly wasmharmonyclient_serverUrls: (a: number) => any;
    readonly wasmharmonyclient_setDbId: (a: number, b: number) => void;
    readonly wasmharmonyclient_setMasterKey: (a: number, b: number, c: number) => [number, number];
    readonly wasmharmonyclient_setMetricsRecorder: (a: number, b: number) => void;
    readonly wasmharmonyclient_setPrpBackend: (a: number, b: number) => [number, number];
    readonly wasmharmonyclient_sync: (a: number, b: any, c: number) => any;
    readonly wasmharmonyclient_syncWithProgress: (a: number, b: any, c: number, d: any) => any;
    readonly wasmharmonyclient_upgradeToSecureChannel: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasmharmonyclient_verifyMerkleBatch: (a: number, b: any, c: number) => any;
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
    readonly wasmarcpresentationstate_nonce: (a: number) => bigint;
    readonly wasmsyncresult_syncedHeight: (a: number) => number;
    readonly wasmsyncresult_wasFreshSync: (a: number) => number;
    readonly __wbg_harmonyanswerpair_free: (a: number, b: number) => void;
    readonly __wbg_harmonygroup_free: (a: number, b: number) => void;
    readonly __wbg_harmonyrequest_free: (a: number, b: number) => void;
    readonly __wbg_harmonyrequestpair_free: (a: number, b: number) => void;
    readonly compute_balanced_t: (a: number) => number;
    readonly harmonyanswerpair_answer_1: (a: number) => [number, number];
    readonly harmonyanswerpair_answer_2: (a: number) => [number, number];
    readonly harmonygroup_build_dummy_request: (a: number) => [number, number, number];
    readonly harmonygroup_build_request: (a: number, b: number) => [number, number, number];
    readonly harmonygroup_build_request_pair: (a: number, b: number, c: number) => [number, number, number];
    readonly harmonygroup_build_synthetic_dummy: (a: number) => [number, number];
    readonly harmonygroup_deserialize: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly harmonygroup_finish_relocation: (a: number) => [number, number];
    readonly harmonygroup_load_hints: (a: number, b: number, c: number) => [number, number];
    readonly harmonygroup_m: (a: number) => number;
    readonly harmonygroup_max_queries: (a: number) => number;
    readonly harmonygroup_n: (a: number) => number;
    readonly harmonygroup_new: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly harmonygroup_new_with_backend: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly harmonygroup_process_response: (a: number, b: number, c: number) => [number, number, number, number];
    readonly harmonygroup_process_response_pair: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly harmonygroup_process_response_xor_only: (a: number, b: number, c: number) => [number, number, number, number];
    readonly harmonygroup_prp_backend: (a: number) => number;
    readonly harmonygroup_queries_remaining: (a: number) => number;
    readonly harmonygroup_queries_used: (a: number) => number;
    readonly harmonygroup_real_n: (a: number) => number;
    readonly harmonygroup_serialize: (a: number) => [number, number];
    readonly harmonygroup_t: (a: number) => number;
    readonly harmonygroup_w: (a: number) => number;
    readonly harmonyrequest_query_index: (a: number) => number;
    readonly harmonyrequest_request: (a: number) => [number, number];
    readonly harmonyrequest_segment: (a: number) => number;
    readonly harmonyrequestpair_request_1: (a: number) => number;
    readonly harmonyrequestpair_request_2: (a: number) => number;
    readonly verify_protocol: (a: number, b: number) => number;
    readonly harmonyrequest_position: (a: number) => number;
    readonly wasm_bindgen__closure__destroy__h490263039c0c107c: (a: number, b: number) => void;
    readonly wasm_bindgen__closure__destroy__h0ce9efb4136d99f9: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h9bbb2438131d711c: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h1227e1e7bfd44bf9: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h42780bd4d4f8b456: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h42780bd4d4f8b456_2: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h42780bd4d4f8b456_3: (a: number, b: number, c: any) => void;
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
