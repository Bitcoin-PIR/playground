/* @ts-self-types="./pir_sdk_wasm.d.ts" */

/**
 * PRP backend constant for `FastPRP`. Requires the `fastprp` cargo
 * feature on the enclosing build.
 * @returns {number}
 */
export function PRP_FASTPRP() {
    const ret = wasm.PRP_FASTPRP();
    return ret;
}

/**
 * PRP backend constant for the reference `HMR12` implementation.
 * Always available.
 * @returns {number}
 */
export function PRP_HMR12() {
    const ret = wasm.PRP_HMR12();
    return ret;
}

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
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmAnnounceVerification.prototype);
        obj.__wbg_ptr = ptr;
        WasmAnnounceVerificationFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmAnnounceVerificationFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmannounceverification_free(ptr, 0);
    }
    /**
     * Hex-encoded binary SHA-256 the manifest claims (self-reported,
     * trustworthy iff the chain check passed).
     * @returns {string}
     */
    get binarySha256Hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmannounceverification_binarySha256Hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Diagnostic string describing why `chainVerified` is false.
     * Empty when verified.
     * @returns {string}
     */
    get chainError() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmannounceverification_chainError(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Whether the in-bundle chain check passed: manifest signature
     * valid against `identityPubkey`, and `cert.server_id` ==
     * `manifest.server_id`, and `cert.identity_pubkey` ==
     * `manifest.identity_pubkey`. Does NOT include cert-vs-pinned-
     * operator verification (caller-driven).
     * @returns {boolean}
     */
    get chainVerified() {
        const ret = wasm.wasmannounceverification_chainVerified(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * X25519 channel pubkey the manifest endorses. Cross-check
     * against the value you'll handshake with (e.g.
     * `attestVerification.serverStaticPub`). Returns the raw 32 bytes.
     * @returns {Uint8Array}
     */
    get channelPub() {
        const ret = wasm.wasmannounceverification_channelPub(this.__wbg_ptr);
        return ret;
    }
    /**
     * Same data as [`Self::channel_pub`] but hex-encoded for display.
     * @returns {string}
     */
    get channelPubHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmannounceverification_channelPubHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
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
     * @param {Uint8Array} expected_channel_pub
     */
    checkChannelBinding(expected_channel_pub) {
        const ptr0 = passArray8ToWasm0(expected_channel_pub, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmannounceverification_checkChannelBinding(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Replay / staleness guard on `manifest.issued_at`. Throws if the
     * bundle is older than `maxAgeSeconds` before `nowUnixSeconds`
     * (stale) or more than 300s after it (future-dated). NOTE:
     * `issued_at` is the server's boot time, so pick `maxAgeSeconds`
     * generously (≥ expected uptime); pass `0n` to skip the staleness
     * arm, or `nowUnixSeconds === 0n` to skip entirely. Mirrors the Rust
     * `AnnounceVerification::check_freshness`.
     * @param {bigint} now_unix_seconds
     * @param {bigint} max_age_seconds
     */
    checkFreshness(now_unix_seconds, max_age_seconds) {
        const ret = wasm.wasmannounceverification_checkFreshness(this.__wbg_ptr, now_unix_seconds, max_age_seconds);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Verify the bundle against a pinned operator pubkey: operator
     * pubkey match + the cert's operator **signature** (`cert.verify()`)
     * + validity window (skipped when `nowUnixSeconds == 0`) + the
     * in-bundle chain check. Throws on any failure or a non-32-byte
     * argument. A bare `operatorPubkeyHex` string-compare would miss
     * the signature check, so use this. Mirrors the Rust
     * `AnnounceVerification::check_pinned_operator`.
     * @param {Uint8Array} pinned_operator_pubkey
     * @param {bigint} now_unix_seconds
     */
    checkPinnedOperator(pinned_operator_pubkey, now_unix_seconds) {
        const ptr0 = passArray8ToWasm0(pinned_operator_pubkey, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmannounceverification_checkPinnedOperator(this.__wbg_ptr, ptr0, len0, now_unix_seconds);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Server-self-reported git rev (string).
     * @returns {string}
     */
    get gitRev() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmannounceverification_gitRev(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Hex-encoded identity pubkey the operator endorsed for this
     * server. The Tier-2 manifest signature chains back to this key.
     * @returns {string}
     */
    get identityPubkeyHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmannounceverification_identityPubkeyHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Manifest's `issued_at` timestamp (unix-seconds). Use this to
     * apply a freshness policy if you want one.
     * @returns {bigint}
     */
    get issuedAt() {
        const ret = wasm.wasmannounceverification_issuedAt(this.__wbg_ptr);
        return ret;
    }
    /**
     * Hex-encoded operator pubkey (the Tier-1 signer). Compare this
     * against the value the operator published out-of-band (e.g. via
     * Nostr) before trusting any of the bundle's fields.
     * @returns {string}
     */
    get operatorPubkeyHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmannounceverification_operatorPubkeyHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Server identifier the cert was endorsed for (e.g. "pir1").
     * @returns {string}
     */
    get serverId() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmannounceverification_serverId(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Cert validity lower bound (unix-seconds). 0 = no lower bound.
     * @returns {bigint}
     */
    get validFrom() {
        const ret = wasm.wasmannounceverification_validFrom(this.__wbg_ptr);
        return ret;
    }
    /**
     * Cert validity upper bound (unix-seconds). 0 = indefinite.
     * @returns {bigint}
     */
    get validUntil() {
        const ret = wasm.wasmannounceverification_validUntil(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) WasmAnnounceVerification.prototype[Symbol.dispose] = WasmAnnounceVerification.prototype.free;

/**
 * JavaScript view of [`ArcCredentialState`].
 */
export class WasmArcCredential {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmArcCredentialFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmarccredential_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    epoch() {
        const ret = wasm.wasmarccredential_epoch(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * `credential` from [`WasmArcCredentialRequest::finalize`], the epoch
     * and presentation limit the issuer named, and the persisted
     * `next_nonce` (0 for a fresh credential).
     * @param {Uint8Array} credential
     * @param {number} epoch
     * @param {number} presentation_limit
     * @param {number} next_nonce
     */
    constructor(credential, epoch, presentation_limit, next_nonce) {
        const ptr0 = passArray8ToWasm0(credential, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmarccredential_new(ptr0, len0, epoch, presentation_limit, next_nonce);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        WasmArcCredentialFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Persist this after every [`Self::present`], before sending the payload.
     * @returns {number}
     */
    nextNonce() {
        const ret = wasm.wasmarccredential_nextNonce(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * A `REQ_CREDIT_PRESENT` kind-2 payload of `count` presentations,
     * advancing the nonce counter. Fails without consuming anything when
     * fewer than `count` remain.
     * @param {number} count
     * @returns {Uint8Array}
     */
    present(count) {
        const ret = wasm.wasmarccredential_present(this.__wbg_ptr, count);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    presentationLimit() {
        const ret = wasm.wasmarccredential_presentationLimit(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Presentations (credits) left.
     * @returns {number}
     */
    remaining() {
        const ret = wasm.wasmarccredential_remaining(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) WasmArcCredential.prototype[Symbol.dispose] = WasmArcCredential.prototype.free;

/**
 * JavaScript view of [`ArcRequestState`].
 */
export class WasmArcCredentialRequest {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmArcCredentialRequest.prototype);
        obj.__wbg_ptr = ptr;
        WasmArcCredentialRequestFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmArcCredentialRequestFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmarccredentialrequest_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    epoch() {
        const ret = wasm.wasmarccredentialrequest_epoch(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Finish with the issuer's answer (`response_hex` decoded, and the
     * `issuer_public_key_hex` it named): verifies the issuance proof and
     * returns the credential bytes to persist.
     * @param {string} issuer_public_key_hex
     * @param {Uint8Array} response
     * @returns {Uint8Array}
     */
    finalize(issuer_public_key_hex, response) {
        const ptr0 = passStringToWasm0(issuer_public_key_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(response, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmarccredentialrequest_finalize(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v3;
    }
    /**
     * Restore a request persisted before paying.
     * @param {number} epoch
     * @param {Uint8Array} secrets
     * @param {Uint8Array} request
     * @returns {WasmArcCredentialRequest}
     */
    static fromBytes(epoch, secrets, request) {
        const ptr0 = passArray8ToWasm0(secrets, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(request, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmarccredentialrequest_fromBytes(epoch, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WasmArcCredentialRequest.__wrap(ret[0]);
    }
    /**
     * A fresh request for `epoch` (the issuer's current epoch from
     * `GET /v2/info`).
     * @param {number} epoch
     */
    constructor(epoch) {
        const ret = wasm.wasmarccredentialrequest_new(epoch);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        WasmArcCredentialRequestFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Bytes to send as `request_hex` in `POST /v2/credentials`.
     * @returns {Uint8Array}
     */
    requestBytes() {
        const ret = wasm.wasmarccredentialrequest_requestBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Secrets to persist next to the request bytes.
     * @returns {Uint8Array}
     */
    secretsBytes() {
        const ret = wasm.wasmarccredentialrequest_secretsBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) WasmArcCredentialRequest.prototype[Symbol.dispose] = WasmArcCredentialRequest.prototype.free;

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
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmAtomicMetricsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmatomicmetrics_free(ptr, 0);
    }
    /**
     * Construct a fresh recorder with every counter at zero.
     */
    constructor() {
        const ret = wasm.wasmatomicmetrics_new();
        this.__wbg_ptr = ret >>> 0;
        WasmAtomicMetricsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
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
     * @returns {any}
     */
    snapshot() {
        const ret = wasm.wasmatomicmetrics_snapshot(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) WasmAtomicMetrics.prototype[Symbol.dispose] = WasmAtomicMetrics.prototype.free;

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
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmAttestVerification.prototype);
        obj.__wbg_ptr = ptr;
        WasmAttestVerificationFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmAttestVerificationFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmattestverification_free(ptr, 0);
    }
    /**
     * Raw PEM bytes of the AMD ARK (Root Key) cert. Empty when not
     * bundled by the server.
     * @returns {Uint8Array}
     */
    get arkPem() {
        const ret = wasm.wasmattestverification_arkPem(this.__wbg_ptr);
        return ret;
    }
    /**
     * Raw PEM bytes of the AMD ASK (SEV Signing Key) cert. Empty
     * when not bundled.
     * @returns {Uint8Array}
     */
    get askPem() {
        const ret = wasm.wasmattestverification_askPem(this.__wbg_ptr);
        return ret;
    }
    /**
     * SHA-256 of the running `unified_server` binary (server-side
     * self-report). Hex-encoded. Trusted only if `sevStatus` is
     * `"reportDataMatch"`.
     * @returns {string}
     */
    get binarySha256Hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmattestverification_binarySha256Hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Hex-encoded REPORT_DATA preimage hash the client recomputed
     * locally. For comparison against the SEV report's REPORT_DATA[..32]
     * when manually inspecting an attestation.
     * @returns {string}
     */
    get expectedReportDataHashHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmattestverification_expectedReportDataHashHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Git commit baked into the running server binary. May be
     * suffixed with `-dirty` or be the literal `"unknown"`.
     * @returns {string}
     */
    get gitRev() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmattestverification_gitRev(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * True when all three cert PEMs are non-empty. Cheap pre-check
     * before calling `verifyVcekChain` — saves a WASM round-trip
     * when the server hasn't loaded a chain.
     * @returns {boolean}
     */
    get hasVcekChain() {
        const ret = wasm.wasmattestverification_hasVcekChain(this.__wbg_ptr);
        return ret !== 0;
    }
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
     * @returns {string}
     */
    get launchMeasurementHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmattestverification_launchMeasurementHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Per-DB manifest roots in db_id order. Each entry is a 64-char
     * hex string. The all-zero hash means that DB has no
     * `MANIFEST.toml` (legacy / un-verified state).
     * @returns {Array<any>}
     */
    get manifestRootsHex() {
        const ret = wasm.wasmattestverification_manifestRootsHex(this.__wbg_ptr);
        return ret;
    }
    /**
     * 32-byte client nonce sent in REQ_ATTEST. Hex-encoded.
     * @returns {string}
     */
    get nonceHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmattestverification_nonceHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * X25519 public key the server uses for the encrypted channel.
     * Returns the raw 32 bytes — pass directly to
     * [`WasmDpfClient::upgrade_to_secure_channel`]. All-zero if the
     * server doesn't yet have a channel key.
     * @returns {Uint8Array}
     */
    get serverStaticPub() {
        const ret = wasm.wasmattestverification_serverStaticPub(this.__wbg_ptr);
        return ret;
    }
    /**
     * Same data as [`Self::server_static_pub`] but hex-encoded (for
     * display / logging / cross-check against operator-published
     * values).
     * @returns {string}
     */
    get serverStaticPubHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmattestverification_serverStaticPubHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Raw signed SEV-SNP attestation report bytes (~1184 for v5).
     * Empty if the server isn't on a SEV-SNP host. Slice D's AMD VCEK
     * chain verifier consumes this directly.
     * @returns {Uint8Array}
     */
    get sevSnpReport() {
        const ret = wasm.wasmattestverification_sevSnpReport(this.__wbg_ptr);
        return ret;
    }
    /**
     * SEV-SNP REPORT_DATA binding status as a string. One of:
     * `"noSevHost"`, `"reportDataMatch"`, `"reportDataMismatch"`,
     * `"malformedReport"`. Use this to decide whether the
     * self-reported fields below are trustworthy.
     * @returns {string}
     */
    get sevStatus() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmattestverification_sevStatus(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Raw PEM bytes of the per-chip VCEK cert. Empty when not
     * bundled.
     * @returns {Uint8Array}
     */
    get vcekPem() {
        const ret = wasm.wasmattestverification_vcekPem(this.__wbg_ptr);
        return ret;
    }
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
     * @param {Uint8Array | null | undefined} expected_ark_fingerprint
     * @param {WasmPolicyRequirements} policy
     */
    verifyFull(expected_ark_fingerprint, policy) {
        var ptr0 = isLikeNone(expected_ark_fingerprint) ? 0 : passArray8ToWasm0(expected_ark_fingerprint, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        _assertClass(policy, WasmPolicyRequirements);
        const ret = wasm.wasmattestverification_verifyFull(this.__wbg_ptr, ptr0, len0, policy.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {Uint8Array | null} [expected_ark_fingerprint]
     */
    verifyVcekChain(expected_ark_fingerprint) {
        var ptr0 = isLikeNone(expected_ark_fingerprint) ? 0 : passArray8ToWasm0(expected_ark_fingerprint, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmattestverification_verifyVcekChain(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}
if (Symbol.dispose) WasmAttestVerification.prototype[Symbol.dispose] = WasmAttestVerification.prototype.free;

/**
 * Opaque handle over a parsed tree-tops blob. Owns the parsed data so JS
 * can pass it to multiple `verifyBucketMerkleItem` calls without reparsing.
 *
 * Treat as immutable after construction.
 */
export class WasmBucketMerkleTreeTops {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmBucketMerkleTreeTops.prototype);
        obj.__wbg_ptr = ptr;
        WasmBucketMerkleTreeTopsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmBucketMerkleTreeTopsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmbucketmerkletreetops_free(ptr, 0);
    }
    /**
     * `cache_from_level` for the tree at `group_idx`. This is the number of
     * bottom-up sibling-query rounds the client must run before hitting the
     * cached top. Returns `None`-equivalent `u32::MAX` on out-of-range so the
     * JS caller can surface it as a verification failure.
     * @param {number} group_idx
     * @returns {number}
     */
    cacheFromLevel(group_idx) {
        const ret = wasm.wasmbucketmerkletreetops_cacheFromLevel(this.__wbg_ptr, group_idx);
        return ret >>> 0;
    }
    /**
     * Parse a raw tree-tops blob (the payload *after* the `RESP_*` variant
     * byte on the wire — see `REQ_BUCKET_MERKLE_TREE_TOPS` = 0x34).
     *
     * Returns an error string on malformed input.
     * @param {Uint8Array} data
     * @returns {WasmBucketMerkleTreeTops}
     */
    static fromBytes(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmbucketmerkletreetops_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WasmBucketMerkleTreeTops.__wrap(ret[0]);
    }
    /**
     * Published per-group root (the last cached level's only entry). Empty
     * `Uint8Array` on out-of-range or if the tree-top has no levels.
     * @param {number} group_idx
     * @returns {Uint8Array}
     */
    root(group_idx) {
        const ret = wasm.wasmbucketmerkletreetops_root(this.__wbg_ptr, group_idx);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Total number of parsed trees (should equal `K + K_CHUNK` — the server
     * emits INDEX trees `[0..K)` followed by CHUNK trees `[K..K+K_CHUNK)`).
     * @returns {number}
     */
    get treeCount() {
        const ret = wasm.wasmbucketmerkletreetops_treeCount(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) WasmBucketMerkleTreeTops.prototype[Symbol.dispose] = WasmBucketMerkleTreeTops.prototype.free;

/**
 * WASM wrapper for DatabaseCatalog.
 */
export class WasmDatabaseCatalog {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmDatabaseCatalog.prototype);
        obj.__wbg_ptr = ptr;
        WasmDatabaseCatalogFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmDatabaseCatalogFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmdatabasecatalog_free(ptr, 0);
    }
    /**
     * Number of databases in the catalog.
     * @returns {number}
     */
    get count() {
        const ret = wasm.wasmdatabasecatalog_count(this.__wbg_ptr);
        return ret >>> 0;
    }
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
     * @param {any} json
     * @returns {WasmDatabaseCatalog}
     */
    static fromJson(json) {
        const ret = wasm.wasmdatabasecatalog_fromJson(json);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WasmDatabaseCatalog.__wrap(ret[0]);
    }
    /**
     * Get database info (by slot index in the catalog's array) as JSON.
     *
     * Pre-existing, positional — use [`getEntry`](Self::get_entry) if
     * you want to look up by `db_id` instead.
     * @param {number} index
     * @returns {any}
     */
    getDatabase(index) {
        const ret = wasm.wasmdatabasecatalog_getDatabase(this.__wbg_ptr, index);
        return ret;
    }
    /**
     * Get a database's full info by `db_id`, returning the same JSON
     * shape as [`toJson`]'s `databases[i]` entry. Returns `null` if
     * no database in the catalog carries that ID.
     *
     * Complements [`getDatabase`], which is positional — callers who
     * only know the `db_id` (e.g. from a `SyncStep`) should reach
     * here instead of scanning `getDatabase(i)` for the right index.
     * @param {number} db_id
     * @returns {any}
     */
    getEntry(db_id) {
        const ret = wasm.wasmdatabasecatalog_getEntry(this.__wbg_ptr, db_id);
        return ret;
    }
    /**
     * Does the database with `db_id` publish per-bucket bin Merkle
     * commitments? `false` if the database is absent or carries no
     * Merkle section.
     *
     * The JS-side callers check this before enabling proof-backed queries;
     * the native atomic verifier performs the same check internally. The
     * flag is also useful for UI surfaces that show a "verified" badge only
     * when verification actually ran.
     * @param {number} db_id
     * @returns {boolean}
     */
    hasBucketMerkle(db_id) {
        const ret = wasm.wasmdatabasecatalog_hasBucketMerkle(this.__wbg_ptr, db_id);
        return ret !== 0;
    }
    /**
     * Get latest tip height.
     * @returns {number | undefined}
     */
    get latestTip() {
        const ret = wasm.wasmdatabasecatalog_latestTip(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * Create an empty catalog.
     */
    constructor() {
        const ret = wasm.wasmdatabasecatalog_new();
        this.__wbg_ptr = ret >>> 0;
        WasmDatabaseCatalogFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Convert to JSON.
     * @returns {any}
     */
    toJson() {
        const ret = wasm.wasmdatabasecatalog_toJson(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) WasmDatabaseCatalog.prototype[Symbol.dispose] = WasmDatabaseCatalog.prototype.free;

/**
 * JS-visible summary of a verified attested-builder database proof.
 *
 * The Rust side has already checked the proof bundle against the database
 * catalog and policy before constructing this object. Hex values are display
 * oriented: block hashes and MuHash use Bitcoin Core display order; Merkle
 * roots and SHA-256 values are raw hex.
 */
export class WasmDatabaseProof {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmDatabaseProof.prototype);
        obj.__wbg_ptr = ptr;
        WasmDatabaseProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmDatabaseProofFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmdatabaseproof_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get blockHashHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_blockHashHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get bucketSuperRootHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_bucketSuperRootHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get buildKind() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_buildKind(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get builderBinarySha256Hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_builderBinarySha256Hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get builderGitCommit() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_builderGitCommit(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get dbId() {
        const ret = wasm.wasmdatabaseproof_dbId(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get fromBlockHashHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_fromBlockHashHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get fromHeight() {
        const ret = wasm.wasmdatabaseproof_fromHeight(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get height() {
        const ret = wasm.wasmdatabaseproof_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get manifestRootHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_manifestRootHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get muhashHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_muhashHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get networkMagicHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_networkMagicHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number | undefined}
     */
    get onionChunkBinsPerTable() {
        const ret = wasm.wasmdatabaseproof_onionChunkBinsPerTable(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @returns {number}
     */
    get onionEntrySize() {
        const ret = wasm.wasmdatabaseproof_onionEntrySize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number | undefined}
     */
    get onionIndexBinsPerTable() {
        const ret = wasm.wasmdatabaseproof_onionIndexBinsPerTable(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @returns {number | undefined}
     */
    get onionIndexSlotSize() {
        const ret = wasm.wasmdatabaseproof_onionIndexSlotSize(this.__wbg_ptr);
        return ret === 0xFFFFFF ? undefined : ret;
    }
    /**
     * @returns {number | undefined}
     */
    get onionIndexSlotsPerBin() {
        const ret = wasm.wasmdatabaseproof_onionIndexSlotsPerBin(this.__wbg_ptr);
        return ret === 0xFFFFFF ? undefined : ret;
    }
    /**
     * @returns {string}
     */
    get onionSuperRootHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_onionSuperRootHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number | undefined}
     */
    get onionTotalPackedEntries() {
        const ret = wasm.wasmdatabaseproof_onionTotalPackedEntries(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @returns {string}
     */
    get paramsHashHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmdatabaseproof_paramsHashHex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get proofVersion() {
        const ret = wasm.wasmdatabaseproof_proofVersion(this.__wbg_ptr);
        return ret;
    }
    /**
     * Convert to a plain JS object for UI state and callbacks.
     * @returns {any}
     */
    toJson() {
        const ret = wasm.wasmdatabaseproof_toJson(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) WasmDatabaseProof.prototype[Symbol.dispose] = WasmDatabaseProof.prototype.free;

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
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmDpfClientFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmdpfclient_free(ptr, 0);
    }
    /**
     * Send REQ_ANNOUNCE to one of the connected servers and return a
     * [`WasmAnnounceVerification`] with the parsed operator-signed
     * identity bundle.
     *
     * Errors with the server's RESP_ERROR text ("announce not
     * configured") if the server doesn't have an identity key + cert
     * installed. That's a soft state — attest / handshake / queries
     * still work as normal.
     * @param {number} server_index
     * @returns {Promise<WasmAnnounceVerification>}
     */
    announce(server_index) {
        const ret = wasm.wasmdpfclient_announce(this.__wbg_ptr, server_index);
        return ret;
    }
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
     * @param {number} server_index
     * @returns {Promise<WasmAttestVerification>}
     */
    attest(server_index) {
        const ret = wasm.wasmdpfclient_attest(this.__wbg_ptr, server_index);
        return ret;
    }
    /**
     * Uninstall the currently-registered metrics recorder. Subsequent
     * events are silenced on this client — any previously-shared
     * [`WasmAtomicMetrics`] handle held by JS continues to reflect
     * the last observed state and can still be installed on other
     * clients.
     */
    clearMetricsRecorder() {
        wasm.wasmdpfclient_clearMetricsRecorder(this.__wbg_ptr);
    }
    /**
     * Open WebSocket connections to both servers and run the PIR
     * handshake. Idempotent — calling twice is safe (the second call
     * returns early via `PirClient::is_connected`).
     *
     * Rejects on malformed URL, CORS violation, or server refusal.
     * @returns {Promise<void>}
     */
    connect() {
        const ret = wasm.wasmdpfclient_connect(this.__wbg_ptr);
        return ret;
    }
    /**
     * Connect one provider without selecting or dialing its peer.
     * @param {number} server_index
     * @returns {Promise<void>}
     */
    connectServer(server_index) {
        const ret = wasm.wasmdpfclient_connectServer(this.__wbg_ptr, server_index);
        return ret;
    }
    /**
     * Close both WebSocket connections. After this the client returns
     * `isConnected === false` and `connect` must be called before the
     * next query.
     * @returns {Promise<void>}
     */
    disconnect() {
        const ret = wasm.wasmdpfclient_disconnect(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} server_index
     * @returns {Promise<void>}
     */
    disconnectServer(server_index) {
        const ret = wasm.wasmdpfclient_disconnectServer(this.__wbg_ptr, server_index);
        return ret;
    }
    /**
     * Pay one server's metered frames from `provider` when that server
     * requires credits (docs/CREDITS.md). `provider(credits)` returns
     * `{ kind, payload, credits }` or `null`; it is called from inside
     * query calls whenever the connection's balance runs short. Resolves
     * to `"not-enabled"`, `"not-required"`, `"required"`, or `"best-effort"`
     * (free while the server has room, paid only when busy). Call after
     * [`Self::upgrade_to_secure_channel`].
     * @param {number} server_index
     * @param {Function} provider
     * @returns {Promise<string>}
     */
    enableCredits(server_index, provider) {
        const ret = wasm.wasmdpfclient_enableCredits(this.__wbg_ptr, server_index, provider);
        return ret;
    }
    /**
     * Fetch the database catalog from the server.
     *
     * Returns a [`WasmDatabaseCatalog`] wrapping the native catalog —
     * the same class returned by
     * `WasmDatabaseCatalog.fromJson(...)` for the TS fallback path, so
     * downstream sync-planning code works on both surfaces.
     * @returns {Promise<WasmDatabaseCatalog>}
     */
    fetchCatalog() {
        const ret = wasm.wasmdpfclient_fetchCatalog(this.__wbg_ptr);
        return ret;
    }
    /**
     * Fetch and install-or-compare one staged provider's catalog.
     * @param {number} server_index
     * @returns {Promise<WasmDatabaseCatalog>}
     */
    fetchCatalogFromServer(server_index) {
        const ret = wasm.wasmdpfclient_fetchCatalogFromServer(this.__wbg_ptr, server_index);
        return ret;
    }
    /**
     * Consume and install the exact proof handle returned by
     * `verifyDatabaseProof`. JavaScript must perform its production-pin
     * comparison before transferring ownership here.
     * @param {WasmDatabaseProof} proof
     */
    installVerifiedDatabaseProof(proof) {
        _assertClass(proof, WasmDatabaseProof);
        var ptr0 = proof.__destroy_into_raw();
        const ret = wasm.wasmdpfclient_installVerifiedDatabaseProof(this.__wbg_ptr, ptr0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * True while both `conn0` and `conn1` are live.
     * @returns {boolean}
     */
    get isConnected() {
        const ret = wasm.wasmdpfclient_isConnected(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} server_index
     * @returns {boolean}
     */
    isServerConnected(server_index) {
        const ret = wasm.wasmdpfclient_isServerConnected(this.__wbg_ptr, server_index);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * Create a new DPF client. No network I/O happens until `connect` is
     * called.
     * @param {string} server0_url
     * @param {string} server1_url
     */
    constructor(server0_url, server1_url) {
        const ptr0 = passStringToWasm0(server0_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(server1_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdpfclient_new(ptr0, len0, ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        WasmDpfClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
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
     * @param {Function} cb
     */
    onStateChange(cb) {
        wasm.wasmdpfclient_onStateChange(this.__wbg_ptr, cb);
    }
    /**
     * Fetch and authenticate the bucket Merkle tree-tops before any private
     * address query is allowed to run.
     * @param {number} db_id
     * @returns {Promise<void>}
     */
    preflightDatabase(db_id) {
        const ret = wasm.wasmdpfclient_preflightDatabase(this.__wbg_ptr, db_id);
        return ret;
    }
    /**
     * Present credits (docs/CREDITS.md) on one server (`serverIndex` ∈
     * {0, 1}): `kind` 1 is a Cashu token, 2 an ARC payload from
     * [`crate::WasmArcCredential::present`]. Resolves to
     * `{ gasAdded, gasBalance }`. Bearer material: call after
     * [`Self::upgrade_to_secure_channel`].
     * @param {number} server_index
     * @param {number} kind
     * @param {Uint8Array} payload
     * @returns {Promise<any>}
     */
    presentCredits(server_index, kind, payload) {
        const ptr0 = passArray8ToWasm0(payload, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdpfclient_presentCredits(this.__wbg_ptr, server_index, kind, ptr0, len0);
        return ret;
    }
    /**
     * Low-level: query a single database by `db_id` without the
     * catalog/plan orchestration. Matches
     * `PirClient::query_batch`.
     *
     * Returns a JSON array of length `N`, each element either `null`
     * (not found) or a `QueryResult` JSON object (see
     * `WasmQueryResult.toJson()` for the shape).
     * @param {Uint8Array} script_hashes
     * @param {number} db_id
     * @returns {Promise<any>}
     */
    queryBatch(script_hashes, db_id) {
        const ret = wasm.wasmdpfclient_queryBatch(this.__wbg_ptr, script_hashes, db_id);
        return ret;
    }
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
     * @param {Uint8Array} script_hashes
     * @param {number} db_id
     * @returns {Promise<any>}
     */
    queryBatchVerified(script_hashes, db_id) {
        const ret = wasm.wasmdpfclient_queryBatchVerified(this.__wbg_ptr, script_hashes, db_id);
        return ret;
    }
    /**
     * Return the two server URLs this client is connected to as a
     * `[string, string]` array (order matches the constructor:
     * `[server0_url, server1_url]`).
     *
     * Safe to call at any time — no network I/O, no connection state
     * needed.
     * @returns {any}
     */
    serverUrls() {
        const ret = wasm.wasmdpfclient_serverUrls(this.__wbg_ptr);
        return ret;
    }
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
     * @param {WasmAtomicMetrics} metrics
     */
    setMetricsRecorder(metrics) {
        _assertClass(metrics, WasmAtomicMetrics);
        wasm.wasmdpfclient_setMetricsRecorder(this.__wbg_ptr, metrics.__wbg_ptr);
    }
    /**
     * Select whether every query must be bound to proof-verified database
     * roots installed during the current connection.
     * @param {boolean} require_verified
     */
    setRequireVerifiedDatabaseRoots(require_verified) {
        wasm.wasmdpfclient_setRequireVerifiedDatabaseRoots(this.__wbg_ptr, require_verified);
    }
    /**
     * Set one staged provider URL before that leg is connected.
     * @param {number} server_index
     * @param {string} url
     */
    setServerUrl(server_index, url) {
        const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdpfclient_setServerUrl(this.__wbg_ptr, server_index, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * End-to-end sync: fetch catalog, plan, execute all steps, merge
     * deltas. Returns a [`WasmSyncResult`] whose `results[i]`
     * corresponds to the i-th script hash in the packed input.
     *
     * # Arguments
     * * `script_hashes` — packed `Uint8Array` of length `20 * N`
     * * `last_height` — `null`/`undefined` for fresh sync, otherwise the
     *   last-synced height to compute a delta chain from
     * @param {Uint8Array} script_hashes
     * @param {number | null} [last_height]
     * @returns {Promise<WasmSyncResult>}
     */
    sync(script_hashes, last_height) {
        const ret = wasm.wasmdpfclient_sync(this.__wbg_ptr, script_hashes, isLikeNone(last_height) ? 0x100000001 : (last_height) >>> 0);
        return ret;
    }
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
     * @param {Uint8Array} script_hashes
     * @param {number | null | undefined} last_height
     * @param {Function} progress
     * @returns {Promise<WasmSyncResult>}
     */
    syncWithProgress(script_hashes, last_height, progress) {
        const ret = wasm.wasmdpfclient_syncWithProgress(this.__wbg_ptr, script_hashes, isLikeNone(last_height) ? 0x100000001 : (last_height) >>> 0, progress);
        return ret;
    }
    /**
     * Upgrade one staged provider using only that leg's attestation-bound
     * ephemeral seed. No peer transport is inspected or modified.
     * @param {number} server_index
     * @param {Uint8Array} server_static_pub
     * @returns {Promise<void>}
     */
    upgradeServerToSecureChannel(server_index, server_static_pub) {
        const ptr0 = passArray8ToWasm0(server_static_pub, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdpfclient_upgradeServerToSecureChannel(this.__wbg_ptr, server_index, ptr0, len0);
        return ret;
    }
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
     * @param {Uint8Array} server_static_pub_0
     * @param {Uint8Array} server_static_pub_1
     * @returns {Promise<void>}
     */
    upgradeToSecureChannel(server_static_pub_0, server_static_pub_1) {
        const ptr0 = passArray8ToWasm0(server_static_pub_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(server_static_pub_1, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdpfclient_upgradeToSecureChannel(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * Fetch and verify the attested-builder proof bundle for `dbId`.
     *
     * The proof is checked against the database catalog plus the supplied
     * production policy pins. `expectedParamsHashHex`,
     * `allowedBuilderBinarySha256Hex`, and `allowedBuilderGitCommit` may be
     * `undefined` / empty to skip that particular policy check. Mainnet
     * network magic is always enforced.
     * @param {number} db_id
     * @param {string | null} [expected_params_hash_hex]
     * @param {string | null} [allowed_builder_binary_sha256_hex]
     * @param {string | null} [allowed_builder_git_commit]
     * @returns {Promise<WasmDatabaseProof>}
     */
    verifyDatabaseProof(db_id, expected_params_hash_hex, allowed_builder_binary_sha256_hex, allowed_builder_git_commit) {
        var ptr0 = isLikeNone(expected_params_hash_hex) ? 0 : passStringToWasm0(expected_params_hash_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(allowed_builder_binary_sha256_hex) ? 0 : passStringToWasm0(allowed_builder_binary_sha256_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(allowed_builder_git_commit) ? 0 : passStringToWasm0(allowed_builder_git_commit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdpfclient_verifyDatabaseProof(this.__wbg_ptr, db_id, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * Verify the proof returned by one exact staged provider.
     * @param {number} server_index
     * @param {number} db_id
     * @param {string | null} [expected_params_hash_hex]
     * @param {string | null} [allowed_builder_binary_sha256_hex]
     * @param {string | null} [allowed_builder_git_commit]
     * @returns {Promise<WasmDatabaseProof>}
     */
    verifyDatabaseProofFromServer(server_index, db_id, expected_params_hash_hex, allowed_builder_binary_sha256_hex, allowed_builder_git_commit) {
        var ptr0 = isLikeNone(expected_params_hash_hex) ? 0 : passStringToWasm0(expected_params_hash_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(allowed_builder_binary_sha256_hex) ? 0 : passStringToWasm0(allowed_builder_binary_sha256_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(allowed_builder_git_commit) ? 0 : passStringToWasm0(allowed_builder_git_commit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmdpfclient_verifyDatabaseProofFromServer(this.__wbg_ptr, server_index, db_id, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
}
if (Symbol.dispose) WasmDpfClient.prototype[Symbol.dispose] = WasmDpfClient.prototype.free;

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
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmHarmonyClientFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmharmonyclient_free(ptr, 0);
    }
    /**
     * Send REQ_ANNOUNCE to the hint (`serverIndex=0`) or query
     * (`serverIndex=1`) server. See [`WasmDpfClient::announce`] for
     * full semantics.
     * @param {number} server_index
     * @returns {Promise<WasmAnnounceVerification>}
     */
    announce(server_index) {
        const ret = wasm.wasmharmonyclient_announce(this.__wbg_ptr, server_index);
        return ret;
    }
    /**
     * Send REQ_ATTEST to the hint (`serverIndex=0`) or query
     * (`serverIndex=1`) server and return the verification result.
     * See [`WasmDpfClient::attest`] for the full semantics (including
     * the bound-nonce derivation that ties this attestation to the
     * subsequent handshake).
     * @param {number} server_index
     * @returns {Promise<WasmAttestVerification>}
     */
    attest(server_index) {
        const ret = wasm.wasmharmonyclient_attest(this.__wbg_ptr, server_index);
        return ret;
    }
    /**
     * Return the effective 16-byte master key used by the loaded hint state.
     * V2 hint setup replaces the initial client key with a server-assigned
     * value, so browser persistence must read this value after hint download.
     * @returns {Uint8Array}
     */
    cacheMasterKey() {
        const ret = wasm.wasmharmonyclient_cacheMasterKey(this.__wbg_ptr);
        return ret;
    }
    /**
     * Return the effective PRP backend selected by V2 hint setup.
     * @returns {number}
     */
    cachePrpBackend() {
        const ret = wasm.wasmharmonyclient_cachePrpBackend(this.__wbg_ptr);
        return ret;
    }
    /**
     * Uninstall the currently-registered metrics recorder. See
     * [`WasmDpfClient::clear_metrics_recorder`].
     */
    clearMetricsRecorder() {
        wasm.wasmharmonyclient_clearMetricsRecorder(this.__wbg_ptr);
    }
    /**
     * Open WebSocket connections to both hint and query servers.
     * @returns {Promise<void>}
     */
    connect() {
        const ret = wasm.wasmharmonyclient_connect(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} provider_index
     * @returns {Promise<void>}
     */
    connectProvider(provider_index) {
        const ret = wasm.wasmharmonyclient_connectProvider(this.__wbg_ptr, provider_index);
        return ret;
    }
    /**
     * Get the currently-loaded `db_id`, or `null` if no hints are
     * loaded. See [`HarmonyClient::db_id`] for semantics.
     * @returns {number | undefined}
     */
    dbId() {
        const ret = wasm.wasmharmonyclient_dbId(this.__wbg_ptr);
        return ret === 0xFFFFFF ? undefined : ret;
    }
    /**
     * Close both WebSocket connections.
     * @returns {Promise<void>}
     */
    disconnect() {
        const ret = wasm.wasmharmonyclient_disconnect(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} provider_index
     * @returns {Promise<void>}
     */
    disconnectProvider(provider_index) {
        const ret = wasm.wasmharmonyclient_disconnectProvider(this.__wbg_ptr, provider_index);
        return ret;
    }
    /**
     * Pay the hint (0) or query (1) server's metered frames from
     * `provider` when it requires credits; see [`WasmDpfClient::enable_credits`]. `provider(credits)` returns
     * `{ kind, payload, credits }` or `null`; it is called from inside
     * query calls whenever the connection's balance runs short. Resolves
     * to `"not-enabled"`, `"not-required"`, `"required"`, or `"best-effort"`
     * (free while the server has room, paid only when busy). Call after
     * [`Self::upgrade_to_secure_channel`].
     * @param {number} server_index
     * @param {Function} provider
     * @returns {Promise<string>}
     */
    enableCredits(server_index, provider) {
        const ret = wasm.wasmharmonyclient_enableCredits(this.__wbg_ptr, server_index, provider);
        return ret;
    }
    /**
     * Byte size the blob [`save_hints`](Self::save_hints) would produce
     * right now. Returns `0` when no state is loaded or the client is
     * in an inconsistent state (e.g. catalog missing).
     *
     * O(total hint bytes); fine for UI-polling cadence but not for
     * the hot query path.
     * @returns {number}
     */
    estimateHintSizeBytes() {
        const ret = wasm.wasmharmonyclient_estimateHintSizeBytes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Fetch the database catalog from the hint server.
     * @returns {Promise<WasmDatabaseCatalog>}
     */
    fetchCatalog() {
        const ret = wasm.wasmharmonyclient_fetchCatalog(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} provider_index
     * @returns {Promise<WasmDatabaseCatalog>}
     */
    fetchCatalogFromProvider(provider_index) {
        const ret = wasm.wasmharmonyclient_fetchCatalogFromProvider(this.__wbg_ptr, provider_index);
        return ret;
    }
    /**
     * Pre-fetch every main and Merkle-sibling hint group needed to restore a
     * paid hint entitlement across page reloads. Requires proof-verified tree
     * tops to have been installed through `preflightDatabase` first.
     * @param {WasmDatabaseCatalog} catalog
     * @param {number} db_id
     * @param {Function} progress
     * @returns {Promise<void>}
     */
    fetchCompleteHintsWithProgress(catalog, db_id, progress) {
        _assertClass(catalog, WasmDatabaseCatalog);
        const ret = wasm.wasmharmonyclient_fetchCompleteHintsWithProgress(this.__wbg_ptr, catalog.__wbg_ptr, db_id, progress);
        return ret;
    }
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
     * @param {WasmDatabaseCatalog} catalog
     * @param {number} db_id
     * @param {Function} progress
     * @returns {Promise<void>}
     */
    fetchHintsWithProgress(catalog, db_id, progress) {
        _assertClass(catalog, WasmDatabaseCatalog);
        const ret = wasm.wasmharmonyclient_fetchHintsWithProgress(this.__wbg_ptr, catalog.__wbg_ptr, db_id, progress);
        return ret;
    }
    /**
     * 16-byte fingerprint of the cache key for the given catalog +
     * `db_id`, under this client's current master key and PRP backend.
     * Returns a fresh `Uint8Array` of length 16 on success.
     *
     * Rejects with `JsError` when the catalog doesn't carry `db_id`.
     * The fingerprint matches the one embedded in the `saveHints` blob
     * header and the on-disk cache filename stem, so the JS-side
     * IndexedDB bridge can key cache entries on it directly.
     * @param {WasmDatabaseCatalog} catalog
     * @param {number} db_id
     * @returns {Uint8Array}
     */
    fingerprint(catalog, db_id) {
        _assertClass(catalog, WasmDatabaseCatalog);
        const ret = wasm.wasmharmonyclient_fingerprint(this.__wbg_ptr, catalog.__wbg_ptr, db_id);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * True only when every main and authenticated sibling hint group for the
     * proof-verified database is present in memory.
     * @param {WasmDatabaseCatalog} catalog
     * @param {number} db_id
     * @returns {boolean}
     */
    hasCompleteHints(catalog, db_id) {
        _assertClass(catalog, WasmDatabaseCatalog);
        const ret = wasm.wasmharmonyclient_hasCompleteHints(this.__wbg_ptr, catalog.__wbg_ptr, db_id);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * Consume and install the exact proof handle returned by
     * `verifyDatabaseProof` after the browser's production-pin comparison.
     * @param {WasmDatabaseProof} proof
     */
    installVerifiedDatabaseProof(proof) {
        _assertClass(proof, WasmDatabaseProof);
        var ptr0 = proof.__destroy_into_raw();
        const ret = wasm.wasmharmonyclient_installVerifiedDatabaseProof(this.__wbg_ptr, ptr0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * True while both connections are live.
     * @returns {boolean}
     */
    get isConnected() {
        const ret = wasm.wasmharmonyclient_isConnected(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} provider_index
     * @returns {boolean}
     */
    isProviderConnected(provider_index) {
        const ret = wasm.wasmharmonyclient_isProviderConnected(this.__wbg_ptr, provider_index);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * Restore only a complete paid hint resource. The native client requires
     * proof-verified tree tops for `dbId` and rejects main-only or malformed
     * sibling state, clearing the partial in-memory bundle on failure.
     * @param {Uint8Array} bytes
     * @param {WasmDatabaseCatalog} catalog
     * @param {number} db_id
     */
    loadCompleteHints(bytes, catalog, db_id) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(catalog, WasmDatabaseCatalog);
        const ret = wasm.wasmharmonyclient_loadCompleteHints(this.__wbg_ptr, ptr0, len0, catalog.__wbg_ptr, db_id);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {Uint8Array} bytes
     * @param {WasmDatabaseCatalog} catalog
     * @param {number} db_id
     */
    loadHints(bytes, catalog, db_id) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(catalog, WasmDatabaseCatalog);
        const ret = wasm.wasmharmonyclient_loadHints(this.__wbg_ptr, ptr0, len0, catalog.__wbg_ptr, db_id);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Minimum remaining per-group query budget across every loaded
     * `HarmonyGroup`. Returns `null` when nothing is loaded — callers
     * should treat that as "unknown, call `sync` or `queryBatch` first".
     *
     * UI surfaces use this to decide when to proactively refresh hints.
     * @returns {number | undefined}
     */
    minQueriesRemaining() {
        const ret = wasm.wasmharmonyclient_minQueriesRemaining(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * Create a new HarmonyPIR client. Generates a random master PRP key
     * from `performance.now()`-ish entropy (see `HarmonyClient::new`).
     * Callers that want a stable key (e.g. to reuse cached hints across
     * sessions) must call `setMasterKey`.
     * @param {string} hint_server_url
     * @param {string} query_server_url
     */
    constructor(hint_server_url, query_server_url) {
        const ptr0 = passStringToWasm0(hint_server_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(query_server_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_new(ptr0, len0, ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        WasmHarmonyClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Register a JS callback to be invoked on every
     * [`ConnectionState`](pir_sdk::ConnectionState) transition. See
     * [`WasmDpfClient::on_state_change`].
     * @param {Function} cb
     */
    onStateChange(cb) {
        wasm.wasmharmonyclient_onStateChange(this.__wbg_ptr, cb);
    }
    /**
     * Fetch and authenticate the bucket Merkle tree-tops before any private
     * address query is allowed to run.
     * @param {number} db_id
     * @returns {Promise<void>}
     */
    preflightDatabase(db_id) {
        const ret = wasm.wasmharmonyclient_preflightDatabase(this.__wbg_ptr, db_id);
        return ret;
    }
    /**
     * Present credits (docs/CREDITS.md) on the hint (0) or query (1)
     * server; resolves to `{ gasAdded, gasBalance }`. See
     * [`WasmDpfClient::present_credits`].
     * @param {number} server_index
     * @param {number} kind
     * @param {Uint8Array} payload
     * @returns {Promise<any>}
     */
    presentCredits(server_index, kind, payload) {
        const ptr0 = passArray8ToWasm0(payload, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_presentCredits(this.__wbg_ptr, server_index, kind, ptr0, len0);
        return ret;
    }
    /**
     * Low-level: query a single database by `db_id`. See
     * [`WasmDpfClient::query_batch`].
     * @param {Uint8Array} script_hashes
     * @param {number} db_id
     * @returns {Promise<any>}
     */
    queryBatch(script_hashes, db_id) {
        const ret = wasm.wasmharmonyclient_queryBatch(this.__wbg_ptr, script_hashes, db_id);
        return ret;
    }
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
     * @param {Uint8Array} script_hashes
     * @param {number} db_id
     * @returns {Promise<any>}
     */
    queryBatchVerified(script_hashes, db_id) {
        const ret = wasm.wasmharmonyclient_queryBatchVerified(this.__wbg_ptr, script_hashes, db_id);
        return ret;
    }
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
     * @returns {any}
     */
    saveHints() {
        const ret = wasm.wasmharmonyclient_saveHints(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Return the two server URLs this client is connected to as a
     * `[string, string]` array (order matches the constructor:
     * `[hint_server_url, query_server_url]`).
     *
     * Safe to call at any time — no network I/O, no connection state
     * needed. Mirrors [`WasmDpfClient::server_urls`].
     * @returns {any}
     */
    serverUrls() {
        const ret = wasm.wasmharmonyclient_serverUrls(this.__wbg_ptr);
        return ret;
    }
    /**
     * Pin this client's hint state to `db_id`. If hints for a different
     * db are currently loaded, invalidates them — the next
     * `sync`/`queryBatch`/`queryBatchVerified` will re-fetch (or restore
     * from the hint cache if configured).
     *
     * Idempotent when `db_id` already matches the loaded state.
     * @param {number} db_id
     */
    setDbId(db_id) {
        wasm.wasmharmonyclient_setDbId(this.__wbg_ptr, db_id);
    }
    /**
     * Override the 16-byte master PRP key. Invalidates any previously
     * loaded hints — the next `sync`/`queryBatch` call will re-fetch.
     *
     * Rejects if `key` is not exactly 16 bytes.
     * @param {Uint8Array} key
     */
    setMasterKey(key) {
        const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_setMasterKey(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {WasmAtomicMetrics} metrics
     */
    setMetricsRecorder(metrics) {
        _assertClass(metrics, WasmAtomicMetrics);
        wasm.wasmharmonyclient_setMetricsRecorder(this.__wbg_ptr, metrics.__wbg_ptr);
    }
    /**
     * @param {number} provider_index
     * @param {string} url
     */
    setProviderUrl(provider_index, url) {
        const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_setProviderUrl(this.__wbg_ptr, provider_index, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Select the PRP backend.
     *
     * Accepts [`PRP_HMR12`] or [`PRP_FASTPRP`].
     * [`PRP_HMR12`] is the reference backend (always
     * available); the faster backends require the corresponding cargo
     * features on the enclosing build.
     * @param {number} backend
     */
    setPrpBackend(backend) {
        const ret = wasm.wasmharmonyclient_setPrpBackend(this.__wbg_ptr, backend);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Select whether every query must be bound to proof-verified database
     * roots installed during the current connection.
     * @param {boolean} require_verified
     */
    setRequireVerifiedDatabaseRoots(require_verified) {
        wasm.wasmharmonyclient_setRequireVerifiedDatabaseRoots(this.__wbg_ptr, require_verified);
    }
    /**
     * End-to-end sync. See [`WasmDpfClient::sync`] for argument
     * semantics — the wire path differs but the JS-facing shape is
     * identical.
     * @param {Uint8Array} script_hashes
     * @param {number | null} [last_height]
     * @returns {Promise<WasmSyncResult>}
     */
    sync(script_hashes, last_height) {
        const ret = wasm.wasmharmonyclient_sync(this.__wbg_ptr, script_hashes, isLikeNone(last_height) ? 0x100000001 : (last_height) >>> 0);
        return ret;
    }
    /**
     * Run an end-to-end sync, firing progress events to the given JS
     * callback for every step transition. See
     * [`WasmDpfClient::sync_with_progress`] for the full argument +
     * event-shape contract.
     * @param {Uint8Array} script_hashes
     * @param {number | null | undefined} last_height
     * @param {Function} progress
     * @returns {Promise<WasmSyncResult>}
     */
    syncWithProgress(script_hashes, last_height, progress) {
        const ret = wasm.wasmharmonyclient_syncWithProgress(this.__wbg_ptr, script_hashes, isLikeNone(last_height) ? 0x100000001 : (last_height) >>> 0, progress);
        return ret;
    }
    /**
     * @param {number} provider_index
     * @param {Uint8Array} server_static_pub
     * @returns {Promise<void>}
     */
    upgradeProviderToSecureChannel(provider_index, server_static_pub) {
        const ptr0 = passArray8ToWasm0(server_static_pub, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_upgradeProviderToSecureChannel(this.__wbg_ptr, provider_index, ptr0, len0);
        return ret;
    }
    /**
     * Wrap both server connections (hint + query) with the encrypted
     * channel transport. See [`WasmDpfClient::upgrade_to_secure_channel`]
     * — same eph_seed caching + binding flow. Argument order matches
     * `serverUrls()` — `(hint, query)`.
     * @param {Uint8Array} hint_server_static_pub
     * @param {Uint8Array} query_server_static_pub
     * @returns {Promise<void>}
     */
    upgradeToSecureChannel(hint_server_static_pub, query_server_static_pub) {
        const ptr0 = passArray8ToWasm0(hint_server_static_pub, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(query_server_static_pub, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_upgradeToSecureChannel(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * Fetch and verify the attested-builder proof bundle for `dbId`.
     *
     * See [`WasmDpfClient::verify_database_proof`] for policy argument
     * semantics. Mainnet network magic is always enforced.
     * @param {number} db_id
     * @param {string | null} [expected_params_hash_hex]
     * @param {string | null} [allowed_builder_binary_sha256_hex]
     * @param {string | null} [allowed_builder_git_commit]
     * @returns {Promise<WasmDatabaseProof>}
     */
    verifyDatabaseProof(db_id, expected_params_hash_hex, allowed_builder_binary_sha256_hex, allowed_builder_git_commit) {
        var ptr0 = isLikeNone(expected_params_hash_hex) ? 0 : passStringToWasm0(expected_params_hash_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(allowed_builder_binary_sha256_hex) ? 0 : passStringToWasm0(allowed_builder_binary_sha256_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(allowed_builder_git_commit) ? 0 : passStringToWasm0(allowed_builder_git_commit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_verifyDatabaseProof(this.__wbg_ptr, db_id, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * @param {number} provider_index
     * @param {number} db_id
     * @param {string | null} [expected_params_hash_hex]
     * @param {string | null} [allowed_builder_binary_sha256_hex]
     * @param {string | null} [allowed_builder_git_commit]
     * @returns {Promise<WasmDatabaseProof>}
     */
    verifyDatabaseProofFromProvider(provider_index, db_id, expected_params_hash_hex, allowed_builder_binary_sha256_hex, allowed_builder_git_commit) {
        var ptr0 = isLikeNone(expected_params_hash_hex) ? 0 : passStringToWasm0(expected_params_hash_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(allowed_builder_binary_sha256_hex) ? 0 : passStringToWasm0(allowed_builder_binary_sha256_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(allowed_builder_git_commit) ? 0 : passStringToWasm0(allowed_builder_git_commit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmharmonyclient_verifyDatabaseProofFromProvider(this.__wbg_ptr, provider_index, db_id, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
}
if (Symbol.dispose) WasmHarmonyClient.prototype[Symbol.dispose] = WasmHarmonyClient.prototype.free;

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
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmOramClientFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmoramclient_free(ptr, 0);
    }
    /**
     * Send REQ_ANNOUNCE and return the parsed operator-signed identity
     * bundle.
     * @returns {Promise<WasmAnnounceVerification>}
     */
    announce() {
        const ret = wasm.wasmoramclient_announce(this.__wbg_ptr);
        return ret;
    }
    /**
     * Send REQ_ATTEST and return the parsed verification result.
     *
     * The nonce is bound to the X25519 ephemeral public key that
     * `upgradeToSecureChannel` will use next, matching the DPF/Harmony
     * bound-attestation flow.
     * @returns {Promise<WasmAttestVerification>}
     */
    attest() {
        const ret = wasm.wasmoramclient_attest(this.__wbg_ptr);
        return ret;
    }
    /**
     * Uninstall the currently-registered metrics recorder.
     */
    clearMetricsRecorder() {
        wasm.wasmoramclient_clearMetricsRecorder(this.__wbg_ptr);
    }
    /**
     * Open the WebSocket connection.
     * @returns {Promise<void>}
     */
    connect() {
        const ret = wasm.wasmoramclient_connect(this.__wbg_ptr);
        return ret;
    }
    /**
     * Close the WebSocket connection and clear cached catalog state.
     * @returns {Promise<void>}
     */
    disconnect() {
        const ret = wasm.wasmoramclient_disconnect(this.__wbg_ptr);
        return ret;
    }
    /**
     * Pay the server's metered frames from `provider` when it requires
     * credits; see [`WasmDpfClient::enable_credits`].
     * @param {Function} provider
     * @returns {Promise<string>}
     */
    enableCredits(provider) {
        const ret = wasm.wasmoramclient_enableCredits(this.__wbg_ptr, provider);
        return ret;
    }
    /**
     * Fetch the database catalog from the ORAM server.
     * @returns {Promise<WasmDatabaseCatalog>}
     */
    fetchCatalog() {
        const ret = wasm.wasmoramclient_fetchCatalog(this.__wbg_ptr);
        return ret;
    }
    /**
     * Install a proof only after JavaScript has checked production pins.
     * @param {WasmDatabaseProof} proof
     */
    installVerifiedDatabaseProof(proof) {
        _assertClass(proof, WasmDatabaseProof);
        var ptr0 = proof.__destroy_into_raw();
        const ret = wasm.wasmoramclient_installVerifiedDatabaseProof(this.__wbg_ptr, ptr0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * True while the single ORAM server connection is live.
     * @returns {boolean}
     */
    get isConnected() {
        const ret = wasm.wasmoramclient_isConnected(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Create a new ORAM client. No network I/O happens until `connect`.
     * @param {string} server_url
     */
    constructor(server_url) {
        const ptr0 = passStringToWasm0(server_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmoramclient_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        WasmOramClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Present credits (docs/CREDITS.md) on the connection; resolves to
     * `{ gasAdded, gasBalance }`. See [`WasmDpfClient::present_credits`].
     * @param {number} kind
     * @param {Uint8Array} payload
     * @returns {Promise<any>}
     */
    presentCredits(kind, payload) {
        const ptr0 = passArray8ToWasm0(payload, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmoramclient_presentCredits(this.__wbg_ptr, kind, ptr0, len0);
        return ret;
    }
    /**
     * Low-level ORAM batch query against one database.
     *
     * Returns a JSON array of length `N`, each element either `null`
     * (not found) or the same `QueryResult` JSON object returned by the
     * DPF/Harmony wrappers.
     * @param {Uint8Array} script_hashes
     * @param {number} db_id
     * @returns {Promise<any>}
     */
    queryBatch(script_hashes, db_id) {
        const ret = wasm.wasmoramclient_queryBatch(this.__wbg_ptr, script_hashes, db_id);
        return ret;
    }
    /**
     * Low-level ORAM batch query padded to `paddedSlots`.
     *
     * The JS input contains only real script hashes. The native ORAM client
     * appends explicit empty slots before sending `REQ_ORAM_LOOKUP`, so the
     * TEE spends the same INDEX schedule without treating padding as keys.
     * The returned JSON array contains only the real input results.
     * @param {Uint8Array} script_hashes
     * @param {number} db_id
     * @param {number} padded_slots
     * @returns {Promise<any>}
     */
    queryBatchPadded(script_hashes, db_id, padded_slots) {
        const ret = wasm.wasmoramclient_queryBatchPadded(this.__wbg_ptr, script_hashes, db_id, padded_slots);
        return ret;
    }
    /**
     * Return the configured server URL.
     * @returns {string}
     */
    serverUrl() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmoramclient_serverUrl(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Install a [`WasmAtomicMetrics`] recorder.
     * @param {WasmAtomicMetrics} metrics
     */
    setMetricsRecorder(metrics) {
        _assertClass(metrics, WasmAtomicMetrics);
        wasm.wasmoramclient_setMetricsRecorder(this.__wbg_ptr, metrics.__wbg_ptr);
    }
    /**
     * Require proof-root installation before ORAM query/admission.
     * @param {boolean} require_verified
     */
    setRequireVerifiedDatabaseRoots(require_verified) {
        wasm.wasmoramclient_setRequireVerifiedDatabaseRoots(this.__wbg_ptr, require_verified);
    }
    /**
     * Wrap the single server connection with the encrypted-channel transport.
     *
     * `serverStaticPub` must be the 32-byte key from a verified attestation
     * or announcement. `attest()` must be called first so the channel
     * ephemeral key is bound into the SEV-SNP report nonce.
     * @param {Uint8Array} server_static_pub
     * @returns {Promise<void>}
     */
    upgradeToSecureChannel(server_static_pub) {
        const ptr0 = passArray8ToWasm0(server_static_pub, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmoramclient_upgradeToSecureChannel(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Fetch and verify the attested-builder proof bundle for `dbId`.
     *
     * Uses the same production policy pins and catalog cross-check as
     * `WasmDpfClient.verifyDatabaseProof` and
     * `WasmHarmonyClient.verifyDatabaseProof`.
     * @param {number} db_id
     * @param {string | null} [expected_params_hash_hex]
     * @param {string | null} [allowed_builder_binary_sha256_hex]
     * @param {string | null} [allowed_builder_git_commit]
     * @returns {Promise<WasmDatabaseProof>}
     */
    verifyDatabaseProof(db_id, expected_params_hash_hex, allowed_builder_binary_sha256_hex, allowed_builder_git_commit) {
        var ptr0 = isLikeNone(expected_params_hash_hex) ? 0 : passStringToWasm0(expected_params_hash_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(allowed_builder_binary_sha256_hex) ? 0 : passStringToWasm0(allowed_builder_binary_sha256_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(allowed_builder_git_commit) ? 0 : passStringToWasm0(allowed_builder_git_commit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmoramclient_verifyDatabaseProof(this.__wbg_ptr, db_id, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
}
if (Symbol.dispose) WasmOramClient.prototype[Symbol.dispose] = WasmOramClient.prototype.free;

/**
 * JS-visible policy requirements for [`WasmAttestVerification::verify_full`].
 * Constructed with sensible production defaults (strict). Mutate
 * individual fields via the setters to relax.
 */
export class WasmPolicyRequirements {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmPolicyRequirementsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpolicyrequirements_free(ptr, 0);
    }
    /**
     * Construct the strictest production policy: VMPL 0, no debug,
     * no MA migration, TCB-monotonic. No measurement / family /
     * image pin (set via the corresponding setters if you want them).
     */
    constructor() {
        const ret = wasm.wasmpolicyrequirements_new();
        this.__wbg_ptr = ret >>> 0;
        WasmPolicyRequirementsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Permit guests with `policy.debug_allowed` set. Production: leave false.
     * @param {boolean} v
     */
    setAllowDebug(v) {
        wasm.wasmpolicyrequirements_setAllowDebug(this.__wbg_ptr, v);
    }
    /**
     * Permit guests with `policy.migrate_ma_allowed` set. Production: leave false.
     * @param {boolean} v
     */
    setAllowMigrateMa(v) {
        wasm.wasmpolicyrequirements_setAllowMigrateMa(this.__wbg_ptr, v);
    }
    /**
     * Pin the expected family_id (16 bytes).
     * @param {Uint8Array} bytes
     */
    setExpectedFamilyId(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmpolicyrequirements_setExpectedFamilyId(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Pin the expected image_id (16 bytes).
     * @param {Uint8Array} bytes
     */
    setExpectedImageId(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmpolicyrequirements_setExpectedImageId(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Pin the expected MEASUREMENT (48 bytes). Must be exactly 48
     * bytes or a JsError is thrown. Set to the operator-published
     * value for your Tier 3 UKI.
     * @param {Uint8Array} bytes
     */
    setExpectedMeasurement(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmpolicyrequirements_setExpectedMeasurement(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Raise the VMPL ceiling. Production: leave at 0.
     * @param {number} v
     */
    setMaxVmpl(v) {
        wasm.wasmpolicyrequirements_setMaxVmpl(this.__wbg_ptr, v);
    }
    /**
     * Require guests to have `policy.single_socket_required`. Off by default.
     * @param {boolean} v
     */
    setRequireSingleSocket(v) {
        wasm.wasmpolicyrequirements_setRequireSingleSocket(this.__wbg_ptr, v);
    }
}
if (Symbol.dispose) WasmPolicyRequirements.prototype[Symbol.dispose] = WasmPolicyRequirements.prototype.free;

/**
 * WASM wrapper for QueryResult.
 */
export class WasmQueryResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmQueryResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmQueryResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmQueryResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmqueryresult_free(ptr, 0);
    }
    /**
     * Inspector state: every CHUNK cuckoo bin that backed a decoded
     * UTXO, as a JSON array of `{pbcGroup, binIndex, binContent}`
     * objects. Empty for not-found, whale, or zero-chunk matches.
     * @returns {any}
     */
    chunkBins() {
        const ret = wasm.wasmqueryresult_chunkBins(this.__wbg_ptr);
        return ret;
    }
    /**
     * Number of UTXO entries.
     * @returns {number}
     */
    get entryCount() {
        const ret = wasm.wasmqueryresult_entryCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create an unverified result from JSON.
     *
     * A caller-supplied `merkleVerified` property is ignored and the result
     * is always marked `false`. JSON import is a data-compatibility API, not
     * a proof or release boundary.
     * @param {any} json
     * @returns {WasmQueryResult}
     */
    static fromJson(json) {
        const ret = wasm.wasmqueryresult_fromJson(json);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WasmQueryResult.__wrap(ret[0]);
    }
    /**
     * Get entry at index as JSON.
     * @param {number} index
     * @returns {any}
     */
    getEntry(index) {
        const ret = wasm.wasmqueryresult_getEntry(this.__wbg_ptr, index);
        return ret;
    }
    /**
     * Inspector state: every INDEX cuckoo bin probed for this query,
     * as a JSON array of `{pbcGroup, binIndex, binContent}` objects.
     *
     * Only non-empty for `QueryResult`s produced by the inspector path
     * (e.g. `WasmDpfClient.queryBatchVerified`). Populated for found,
     * not-found, and whale alike — the item-count symmetry invariant
     * guarantees this array always has `INDEX_CUCKOO_NUM_HASHES = 2`
     * entries for an inspector-path result.
     * @returns {any}
     */
    indexBins() {
        const ret = wasm.wasmqueryresult_indexBins(this.__wbg_ptr);
        return ret;
    }
    /**
     * Whether this is a whale address.
     * @returns {boolean}
     */
    get isWhale() {
        const ret = wasm.wasmqueryresult_isWhale(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Inspector state: if this query resolved to a match, the index
     * within [`indexBins`] of the matching bin. Returns `undefined`
     * for not-found / inspector-free results.
     * @returns {any}
     */
    matchedIndexIdx() {
        const ret = wasm.wasmqueryresult_matchedIndexIdx(this.__wbg_ptr);
        return ret;
    }
    /**
     * Whether a native query/sync path established a positive per-bucket
     * Merkle release verdict (or established that commitments are N/A).
     *
     * `WasmQueryResult::new()` and `fromJson()` always return `false`; only
     * crate-internal native SDK paths can set the private provenance marker.
     * A `false` value means unauthenticated/unreleased (including unverified,
     * tainted, or failed), so callers must never interpret it as merely an
     * attempted failure.
     * @returns {boolean}
     */
    get merkleVerified() {
        const ret = wasm.wasmqueryresult_merkleVerified(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Create an empty, unverified result.
     */
    constructor() {
        const ret = wasm.wasmqueryresult_new();
        this.__wbg_ptr = ret >>> 0;
        WasmQueryResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
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
     * @returns {any}
     */
    rawChunkData() {
        const ret = wasm.wasmqueryresult_rawChunkData(this.__wbg_ptr);
        return ret;
    }
    /**
     * Convert to JSON.
     *
     * The emitted object is accepted by [`fromJson`] as a data round-trip,
     * including optional inspector fields (`indexBins`, `chunkBins`,
     * `matchedIndexIdx`). It is deliberately not accepted as proof input by
     * DPF/Harmony clients; a deserialized result has no release authority.
     * @returns {any}
     */
    toJson() {
        const ret = wasm.wasmqueryresult_toJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * Total balance in satoshis.
     * @returns {bigint}
     */
    get totalBalance() {
        const ret = wasm.wasmqueryresult_totalBalance(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
}
if (Symbol.dispose) WasmQueryResult.prototype[Symbol.dispose] = WasmQueryResult.prototype.free;

export class WasmStandaloneSecureChannelV1 {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmStandaloneSecureChannelV1Finalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmstandalonesecurechannelv1_free(ptr, 0);
    }
    /**
     * Canonical cleartext `REQ_ATTEST` frame for this channel attempt.
     * @returns {Uint8Array}
     */
    attestRequest() {
        const ret = wasm.wasmstandalonesecurechannelv1_attestRequest(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Consume the handshake secret and install the AEAD session.
     * @param {Uint8Array} response_frame
     * @param {Uint8Array} server_static_pub
     */
    completeHandshake(response_frame, server_static_pub) {
        const ptr0 = passArray8ToWasm0(response_frame, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(server_static_pub, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmstandalonesecurechannelv1_completeHandshake(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {boolean}
     */
    get established() {
        const ret = wasm.wasmstandalonesecurechannelv1_established(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Canonical cleartext `REQ_HANDSHAKE` using the same hidden ephemeral
     * key committed by [`Self::attest_request`].
     * @returns {Uint8Array}
     */
    handshakeRequest() {
        const ret = wasm.wasmstandalonesecurechannelv1_handshakeRequest(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Create one one-shot, attestation-bound channel attempt.
     */
    constructor() {
        const ret = wasm.wasmstandalonesecurechannelv1_new();
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        WasmStandaloneSecureChannelV1Finalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Authenticate and open one complete length-prefixed server frame.
     * @param {Uint8Array} frame
     * @returns {Uint8Array}
     */
    openFrame(frame) {
        const ptr0 = passArray8ToWasm0(frame, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmstandalonesecurechannelv1_openFrame(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    /**
     * Seal one complete length-prefixed BitcoinPIR frame.
     * @param {Uint8Array} frame
     * @returns {Uint8Array}
     */
    sealFrame(frame) {
        const ptr0 = passArray8ToWasm0(frame, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmstandalonesecurechannelv1_sealFrame(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    /**
     * Non-secret exporter used by service authorization transcript binding.
     * @returns {Uint8Array}
     */
    serviceAuthorizationExporterV1() {
        const ret = wasm.wasmstandalonesecurechannelv1_serviceAuthorizationExporterV1(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Verify a same-socket `RESP_ATTEST` with the nonce bound to our hidden
     * X25519 ephemeral key. The returned handle retains all existing AMD
     * chain, binary-pin and policy verification methods.
     * @param {Uint8Array} response_frame
     * @returns {WasmAttestVerification}
     */
    verifyAttestation(response_frame) {
        const ptr0 = passArray8ToWasm0(response_frame, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmstandalonesecurechannelv1_verifyAttestation(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WasmAttestVerification.__wrap(ret[0]);
    }
}
if (Symbol.dispose) WasmStandaloneSecureChannelV1.prototype[Symbol.dispose] = WasmStandaloneSecureChannelV1.prototype.free;

/**
 * WASM wrapper for SyncPlan.
 */
export class WasmSyncPlan {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmSyncPlan.prototype);
        obj.__wbg_ptr = ptr;
        WasmSyncPlanFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmSyncPlanFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmsyncplan_free(ptr, 0);
    }
    /**
     * Get a step by index.
     * @param {number} index
     * @returns {any}
     */
    getStep(index) {
        const ret = wasm.wasmsyncplan_getStep(this.__wbg_ptr, index);
        return ret;
    }
    /**
     * Whether the plan is empty (already at tip).
     * @returns {boolean}
     */
    get isEmpty() {
        const ret = wasm.wasmsyncplan_isEmpty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Whether this is a fresh sync.
     * @returns {boolean}
     */
    get isFreshSync() {
        const ret = wasm.wasmsyncplan_isFreshSync(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Number of steps in the plan.
     * @returns {number}
     */
    get stepsCount() {
        const ret = wasm.wasmsyncplan_stepsCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Target height after sync.
     * @returns {number}
     */
    get targetHeight() {
        const ret = wasm.wasmsyncplan_targetHeight(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get all steps as JSON array.
     * @returns {any}
     */
    toJson() {
        const ret = wasm.wasmsyncplan_toJson(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) WasmSyncPlan.prototype[Symbol.dispose] = WasmSyncPlan.prototype.free;

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
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmSyncResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmSyncResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmSyncResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmsyncresult_free(ptr, 0);
    }
    /**
     * Get the per-script-hash [`WasmQueryResult`] at `index`, or `null`
     * if the script hash was not found (and Merkle-verified absent when
     * the DB publishes commitments).
     *
     * Mirrors the `results: Vec<Option<QueryResult>>` shape of the
     * underlying sync: `None` = verified absent, `Some(qr)` with
     * `merkleVerified = false` = untrusted/tainted result.
     * @param {number} index
     * @returns {WasmQueryResult | undefined}
     */
    getResult(index) {
        const ret = wasm.wasmsyncresult_getResult(this.__wbg_ptr, index);
        return ret === 0 ? undefined : WasmQueryResult.__wrap(ret);
    }
    /**
     * Number of per-script-hash result slots (= length of the input
     * `scriptHashes` array passed to `sync`).
     * @returns {number}
     */
    get resultCount() {
        const ret = wasm.wasmsyncresult_resultCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Synced height — the tip height the final merged result reflects.
     *
     * For servers that don't publish a height (legacy Harmony without
     * `REQ_GET_DB_CATALOG`), this is `0`. See `CLAUDE.md` →
     * "HarmonyClient REQ_GET_DB_CATALOG with legacy fallback" for the
     * upgrade path.
     * @returns {number}
     */
    get syncedHeight() {
        const ret = wasm.wasmsyncresult_syncedHeight(this.__wbg_ptr);
        return ret >>> 0;
    }
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
     * @returns {any}
     */
    toJson() {
        const ret = wasm.wasmsyncresult_toJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * Whether the sync started from a fresh snapshot (vs an incremental
     * delta chain from a previous height).
     * @returns {boolean}
     */
    get wasFreshSync() {
        const ret = wasm.wasmsyncresult_wasFreshSync(this.__wbg_ptr);
        return ret !== 0;
    }
}
if (Symbol.dispose) WasmSyncResult.prototype[Symbol.dispose] = WasmSyncResult.prototype.free;

/**
 * Auto-invoked by the wasm-bindgen loader once the module is
 * instantiated. Installs a browser-friendly panic hook so Rust
 * `panic!`s surface in the JS console with a readable message and
 * stack trace instead of the bare `RuntimeError: unreachable` that
 * `wasm32-unknown-unknown` emits by default.
 */
export function __wasm_init() {
    wasm.__wasm_init();
}

/**
 * `SHA256(bin_index_u32_LE || bin_content)` — the leaf commitment used by
 * every per-bucket bin-Merkle tree.
 * @param {number} bin_index
 * @param {Uint8Array} bin_content
 * @returns {Uint8Array}
 */
export function bucketMerkleLeafHash(bin_index, bin_content) {
    const ptr0 = passArray8ToWasm0(bin_content, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.bucketMerkleLeafHash(bin_index, ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Compute an arity-N internal-node hash: `SHA256(child_0 || child_1 || …)`.
 *
 * `children_flat` must be a multiple of 32 bytes (one 32B hash per child).
 * Returns an empty array on malformed input so JS can coerce it to a
 * verification failure.
 * @param {Uint8Array} children_flat
 * @returns {Uint8Array}
 */
export function bucketMerkleParentN(children_flat) {
    const ptr0 = passArray8ToWasm0(children_flat, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.bucketMerkleParentN(ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * SHA-256 of `data`. Thin wrapper over `pir_core::merkle::sha256` exposed so
 * JS can drop its own polyfill in favour of the same implementation used by
 * the server and native Rust client.
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function bucketMerkleSha256(data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.bucketMerkleSha256(ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Compute an optimal sync plan from the catalog.
 *
 * # Arguments
 * * `catalog` - Database catalog from server
 * * `last_synced_height` - Last synced height (0 or undefined for fresh sync)
 *
 * # Returns
 * A WasmSyncPlan with steps to execute.
 * @param {WasmDatabaseCatalog} catalog
 * @param {number | null} [last_synced_height]
 * @returns {WasmSyncPlan}
 */
export function computeSyncPlan(catalog, last_synced_height) {
    _assertClass(catalog, WasmDatabaseCatalog);
    const ret = wasm.computeSyncPlan(catalog.__wbg_ptr, isLikeNone(last_synced_height) ? 0x100000001 : (last_synced_height) >>> 0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmSyncPlan.__wrap(ret[0]);
}

/**
 * Compute fingerprint tag. Returns 8 bytes (LE).
 * @param {number} tag_seed_hi
 * @param {number} tag_seed_lo
 * @param {Uint8Array} script_hash
 * @returns {Uint8Array}
 */
export function computeTag(tag_seed_hi, tag_seed_lo, script_hash) {
    const ptr0 = passArray8ToWasm0(script_hash, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.computeTag(tag_seed_hi, tag_seed_lo, ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Cuckoo hash a script hash.
 * @param {Uint8Array} script_hash
 * @param {number} key_hi
 * @param {number} key_lo
 * @param {number} num_bins
 * @returns {number}
 */
export function cuckooHash(script_hash, key_hi, key_lo, num_bins) {
    const ptr0 = passArray8ToWasm0(script_hash, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.cuckooHash(ptr0, len0, key_hi, key_lo, num_bins);
    return ret >>> 0;
}

/**
 * Cuckoo hash an integer chunk ID.
 * @param {number} chunk_id
 * @param {number} key_hi
 * @param {number} key_lo
 * @param {number} num_bins
 * @returns {number}
 */
export function cuckooHashInt(chunk_id, key_hi, key_lo, num_bins) {
    const ret = wasm.cuckooHashInt(chunk_id, key_hi, key_lo, num_bins);
    return ret >>> 0;
}

/**
 * Cuckoo-place items into groups.
 * @param {Uint32Array} cand_groups_flat
 * @param {number} num_items
 * @param {number} num_groups
 * @param {number} max_kicks
 * @param {number} num_hashes
 * @returns {Int32Array}
 */
export function cuckooPlace(cand_groups_flat, num_items, num_groups, max_kicks, num_hashes) {
    const ptr0 = passArray32ToWasm0(cand_groups_flat, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.cuckooPlace(ptr0, len0, num_items, num_groups, max_kicks, num_hashes);
    var v2 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Decode delta data from raw bytes.
 *
 * Returns JSON with `spent` (array of outpoint hex strings) and
 * `newUtxos` (array of UTXO entries).
 * @param {Uint8Array} raw
 * @returns {any}
 */
export function decodeDeltaData(raw) {
    const ptr0 = passArray8ToWasm0(raw, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.decodeDeltaData(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode UTXO data from bytes. Returns JSON array.
 * @param {Uint8Array} data
 * @returns {any}
 */
export function decodeUtxoData(data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.decodeUtxoData(ptr0, len0);
    return ret;
}

/**
 * Derive 3 group indices for a chunk ID.
 * @param {number} chunk_id
 * @param {number} k
 * @returns {Uint32Array}
 */
export function deriveChunkGroups(chunk_id, k) {
    const ret = wasm.deriveChunkGroups(chunk_id, k);
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Derive cuckoo hash key. Returns 8 bytes (LE).
 * @param {number} master_seed_hi
 * @param {number} master_seed_lo
 * @param {number} group_id
 * @param {number} hash_fn
 * @returns {Uint8Array}
 */
export function deriveCuckooKey(master_seed_hi, master_seed_lo, group_id, hash_fn) {
    const ret = wasm.deriveCuckooKey(master_seed_hi, master_seed_lo, group_id, hash_fn);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Derive 3 group indices for a script hash.
 * @param {Uint8Array} script_hash
 * @param {number} k
 * @returns {Uint32Array}
 */
export function deriveGroups(script_hash, k) {
    const ptr0 = passArray8ToWasm0(script_hash, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.deriveGroups(ptr0, len0, k);
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

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
 * @param {Uint8Array} frame
 * @returns {Uint32Array}
 */
export function harmony_decode_counts(frame) {
    const ptr0 = passArray8ToWasm0(frame, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.harmony_decode_counts(ptr0, len0);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

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
export function initTracingSubscriber() {
    wasm.initTracingSubscriber();
}

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
 * @param {WasmQueryResult} snapshot
 * @param {Uint8Array} delta_raw
 * @returns {WasmQueryResult}
 */
export function mergeDelta(snapshot, delta_raw) {
    _assertClass(snapshot, WasmQueryResult);
    const ptr0 = passArray8ToWasm0(delta_raw, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.mergeDelta(snapshot.__wbg_ptr, ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmQueryResult.__wrap(ret[0]);
}

/**
 * Plan multi-round PBC placement. Returns JSON.
 * @param {Uint32Array} item_groups_flat
 * @param {number} items_per
 * @param {number} num_groups
 * @param {number} num_hashes
 * @param {number} max_kicks
 * @returns {any}
 */
export function planRounds(item_groups_flat, items_per, num_groups, num_hashes, max_kicks) {
    const ptr0 = passArray32ToWasm0(item_groups_flat, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.planRounds(ptr0, len0, items_per, num_groups, num_hashes, max_kicks);
    return ret;
}

/**
 * Read a LEB128 varint. Returns [value_lo, value_hi, bytes_consumed].
 * @param {Uint8Array} data
 * @param {number} offset
 * @returns {Uint32Array}
 */
export function readVarint(data, offset) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.readVarint(ptr0, len0, offset);
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Splitmix64 finalizer. Returns 8 bytes (LE).
 * @param {number} x_hi
 * @param {number} x_lo
 * @returns {Uint8Array}
 */
export function splitmix64(x_hi, x_lo) {
    const ret = wasm.splitmix64(x_hi, x_lo);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * JS-visible accessor for the Turin ARK fingerprint pinned in
 * pir-attest-verify (matches `web/src/attest-pin.ts`). Returns the
 * 32-byte SHA-256 as a Uint8Array. Pass directly to
 * [`WasmAttestVerification::verify_full`] /
 * [`WasmAttestVerification::verify_vcek_chain`] for Turin servers.
 * @returns {Uint8Array}
 */
export function turinArkFingerprint() {
    const ret = wasm.turinArkFingerprint();
    return ret;
}

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
 * @param {Uint8Array} resp_payload
 * @returns {WasmAnnounceVerification}
 */
export function verifyAnnounceResponse(resp_payload) {
    const ptr0 = passArray8ToWasm0(resp_payload, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.verifyAnnounceResponse(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmAnnounceVerification.__wrap(ret[0]);
}

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
 * @param {number} bin_index
 * @param {Uint8Array} bin_content
 * @param {number} pbc_group
 * @param {Uint8Array} sibling_rows_flat
 * @param {WasmBucketMerkleTreeTops} tree_tops
 * @returns {boolean}
 */
export function verifyBucketMerkleItem(bin_index, bin_content, pbc_group, sibling_rows_flat, tree_tops) {
    const ptr0 = passArray8ToWasm0(bin_content, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(sibling_rows_flat, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(tree_tops, WasmBucketMerkleTreeTops);
    const ret = wasm.verifyBucketMerkleItem(bin_index, ptr0, len0, pbc_group, ptr1, len1, tree_tops.__wbg_ptr);
    return ret !== 0;
}

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
 * @param {Uint8Array} response_frame
 * @param {WasmDatabaseCatalog} catalog
 * @param {number} expected_db_id
 * @param {string | null} [expected_params_hash_hex]
 * @param {string | null} [allowed_builder_binary_sha256_hex]
 * @param {string | null} [allowed_builder_git_commit]
 * @returns {WasmDatabaseProof}
 */
export function verifyDatabaseProofResponse(response_frame, catalog, expected_db_id, expected_params_hash_hex, allowed_builder_binary_sha256_hex, allowed_builder_git_commit) {
    const ptr0 = passArray8ToWasm0(response_frame, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(catalog, WasmDatabaseCatalog);
    var ptr1 = isLikeNone(expected_params_hash_hex) ? 0 : passStringToWasm0(expected_params_hash_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    var ptr2 = isLikeNone(allowed_builder_binary_sha256_hex) ? 0 : passStringToWasm0(allowed_builder_binary_sha256_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len2 = WASM_VECTOR_LEN;
    var ptr3 = isLikeNone(allowed_builder_git_commit) ? 0 : passStringToWasm0(allowed_builder_git_commit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len3 = WASM_VECTOR_LEN;
    const ret = wasm.verifyDatabaseProofResponse(ptr0, len0, catalog.__wbg_ptr, expected_db_id, ptr1, len1, ptr2, len2, ptr3, len3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmDatabaseProof.__wrap(ret[0]);
}

/**
 * Strict OnionPIR verifier. It accepts only the v2 opcode/bundle/evidence
 * stack and therefore cannot silently fall back to a v1 proof.
 * @param {Uint8Array} response_frame
 * @param {WasmDatabaseCatalog} catalog
 * @param {number} expected_db_id
 * @param {string | null} [expected_params_hash_hex]
 * @param {string | null} [allowed_builder_binary_sha256_hex]
 * @param {string | null} [allowed_builder_git_commit]
 * @returns {WasmDatabaseProof}
 */
export function verifyDatabaseProofV2Response(response_frame, catalog, expected_db_id, expected_params_hash_hex, allowed_builder_binary_sha256_hex, allowed_builder_git_commit) {
    const ptr0 = passArray8ToWasm0(response_frame, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(catalog, WasmDatabaseCatalog);
    var ptr1 = isLikeNone(expected_params_hash_hex) ? 0 : passStringToWasm0(expected_params_hash_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    var ptr2 = isLikeNone(allowed_builder_binary_sha256_hex) ? 0 : passStringToWasm0(allowed_builder_binary_sha256_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len2 = WASM_VECTOR_LEN;
    var ptr3 = isLikeNone(allowed_builder_git_commit) ? 0 : passStringToWasm0(allowed_builder_git_commit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len3 = WASM_VECTOR_LEN;
    const ret = wasm.verifyDatabaseProofV2Response(ptr0, len0, catalog.__wbg_ptr, expected_db_id, ptr1, len1, ptr2, len2, ptr3, len3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WasmDatabaseProof.__wrap(ret[0]);
}

/**
 * Verify a standalone SEV-SNP report and PEM certificate chain.
 *
 * This is the static-artifact companion to
 * [`WasmAttestVerification::verify_full`]. Live runtime attestation gets
 * its report and VCEK chain from the server response; database-authenticity
 * proof pages load the same shape from `/proofs/...` static files instead.
 * @param {Uint8Array} report_bytes
 * @param {string} ark_pem
 * @param {string} ask_pem
 * @param {string} vcek_pem
 * @param {Uint8Array | null | undefined} expected_ark_fingerprint
 * @param {WasmPolicyRequirements} policy
 */
export function verifyRawSnpReport(report_bytes, ark_pem, ask_pem, vcek_pem, expected_ark_fingerprint, policy) {
    const ptr0 = passArray8ToWasm0(report_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(ark_pem, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(ask_pem, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm0(vcek_pem, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len3 = WASM_VECTOR_LEN;
    var ptr4 = isLikeNone(expected_ark_fingerprint) ? 0 : passArray8ToWasm0(expected_ark_fingerprint, wasm.__wbindgen_malloc);
    var len4 = WASM_VECTOR_LEN;
    _assertClass(policy, WasmPolicyRequirements);
    const ret = wasm.verifyRawSnpReport(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, policy.__wbg_ptr);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * XOR two sibling-batch responses of equal length and return the result.
 *
 * Returns an empty array if the inputs are different lengths (the DPF XOR
 * only makes sense for identical-length responses; a mismatch is always a
 * protocol error the caller should surface as a verification failure).
 *
 * This is a convenience for JS so the `server0 ⊕ server1` fold lives next
 * to the rest of the verifier instead of being hand-rolled per client.
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {Uint8Array}
 */
export function xorBuffers(a, b) {
    const ptr0 = passArray8ToWasm0(a, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(b, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.xorBuffers(ptr0, len0, ptr1, len1);
    var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v3;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_83742b46f01ce22d: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_bigint_get_as_i64_447a76b5c6ef7bda: function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_c0f3f60bac5a78d1: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_5398f5bb970e0daa: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_41dbb8413020e076: function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        },
        __wbg___wbindgen_is_bigint_e2141d4f045b7eda: function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_3c846841762788c1: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_0b605fc6b167c56f: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_object_781bc9f159099513: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_7ef6b97b02428fae: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_52709e72fb9f179c: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_ee31bfad3e536463: function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_5bcc3bed3c69e72b: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_number_get_34bb9d9dcfa21373: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_395e606bd0ee4427: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_6b5b6b8576d35cb1: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_call_2d781c1f4d5c0ef8: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_call_dcc2662fa17a72cf: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.call(arg1, arg2, arg3);
            return ret;
        }, arguments); },
        __wbg_call_e133b57c9155d22c: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_close_af26905c832a88cb: function() { return handleError(function (arg0) {
            arg0.close();
        }, arguments); },
        __wbg_code_aea376e2d265a64f: function(arg0) {
            const ret = arg0.code;
            return ret;
        },
        __wbg_crypto_38df2bab126b63dc: function(arg0) {
            const ret = arg0.crypto;
            return ret;
        },
        __wbg_data_a3d9ff9cdd801002: function(arg0) {
            const ret = arg0.data;
            return ret;
        },
        __wbg_done_08ce71ee07e3bd17: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_entries_e8a20ff8c9757101: function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        },
        __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_getRandomValues_c44a50d8cfdaebeb: function() { return handleError(function (arg0, arg1) {
            arg0.getRandomValues(arg1);
        }, arguments); },
        __wbg_get_326e41e095fb2575: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_3ef1eba1850ade27: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_a8ee5c45dabc1b3b: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_unchecked_329cfe50afab7352: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_instanceof_ArrayBuffer_101e2bf31071a9f6: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_CloseEvent_0642db80e552e65d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof CloseEvent;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_f194b366846aca0c: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_740438561a5b956d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_33b91feb269ff46e: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_isSafeInteger_ecd6a7f9c3e053cd: function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        },
        __wbg_iterator_d8f549ec8fb061b1: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_length_b3416cf66a5452c8: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_ea16607d7b61445b: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_log_0c201ade58bb55e1: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.log(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3), getStringFromWasm0(arg4, arg5), getStringFromWasm0(arg6, arg7));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_log_ce2c4456b290c5e7: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.log(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_mark_b4d943f3bc2d2404: function(arg0, arg1) {
            performance.mark(getStringFromWasm0(arg0, arg1));
        },
        __wbg_measure_84362959e621a2c1: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            let deferred0_0;
            let deferred0_1;
            let deferred1_0;
            let deferred1_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                deferred1_0 = arg2;
                deferred1_1 = arg3;
                performance.measure(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
                wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
            }
        }, arguments); },
        __wbg_message_67f6368dc2a526af: function(arg0, arg1) {
            const ret = arg1.message;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
            const ret = arg0.msCrypto;
            return ret;
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_49d5571bd3f0c4d4: function() {
            const ret = new Map();
            return ret;
        },
        __wbg_new_5f486cdf45a04d78: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_a70fbab9066b301f: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_ab79df5bd7c26067: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_dd50bcc3f60ba434: function() { return handleError(function (arg0, arg1) {
            const ret = new WebSocket(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_from_slice_22da9388ac046e50: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_typed_aaaeaf29cf802876: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen__convert__closures_____invoke__h1227e1e7bfd44bf9(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = state0.b = 0;
            }
        },
        __wbg_new_with_length_825018a1616e9e55: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        },
        __wbg_next_11b99ee6237339e3: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_next_e01a967809d1aa68: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_node_84ea875411254db1: function(arg0) {
            const ret = arg0.node;
            return ret;
        },
        __wbg_now_16f0c993d5dd6c27: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_now_e7c6795a7f81e10f: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_performance_3fcf6e32a7e1ed0a: function(arg0) {
            const ret = arg0.performance;
            return ret;
        },
        __wbg_process_44c7a14e11e9f69e: function(arg0) {
            const ret = arg0.process;
            return ret;
        },
        __wbg_prototypesetcall_d62e5099504357e6: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_push_e87b0e732085a946: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_queueMicrotask_0c399741342fb10f: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_a082d78ce798393e: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_randomFillSync_6c25eac9869eb53c: function() { return handleError(function (arg0, arg1) {
            arg0.randomFillSync(arg1);
        }, arguments); },
        __wbg_readyState_1f1e7f1bdf9f4d42: function(arg0) {
            const ret = arg0.readyState;
            return ret;
        },
        __wbg_reason_cbcb9911796c4714: function(arg0, arg1) {
            const ret = arg1.reason;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_require_b4edbdcf3e2a1ef0: function() { return handleError(function () {
            const ret = module.require;
            return ret;
        }, arguments); },
        __wbg_resolve_ae8d83246e5bcc12: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_send_d31a693c975dea74: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.send(getArrayU8FromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_set_282384002438957f: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_7eaa4f96924fd6b3: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_bf7251625df30a02: function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        },
        __wbg_set_binaryType_3dcf8281ec100a8f: function(arg0, arg1) {
            arg0.binaryType = __wbindgen_enum_BinaryType[arg1];
        },
        __wbg_set_onclose_8da801226bdd7a7b: function(arg0, arg1) {
            arg0.onclose = arg1;
        },
        __wbg_set_onerror_901ca711f94a5bbb: function(arg0, arg1) {
            arg0.onerror = arg1;
        },
        __wbg_set_onmessage_6f80ab771bf151aa: function(arg0, arg1) {
            arg0.onmessage = arg1;
        },
        __wbg_set_onopen_34e3e24cf9337ddd: function(arg0, arg1) {
            arg0.onopen = arg1;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_8adb955bd33fac2f: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_ad356e0db91c7913: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_f207c857566db248: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_bb9f1ba69d61b386: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_subarray_a068d24e39478a8a: function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_then_098abe61755d12f6: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_value_21fc78aab0322612: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbg_versions_276b2795b1c6a219: function(arg0) {
            const ret = arg0.versions;
            return ret;
        },
        __wbg_wasmannounceverification_new: function(arg0) {
            const ret = WasmAnnounceVerification.__wrap(arg0);
            return ret;
        },
        __wbg_wasmattestverification_new: function(arg0) {
            const ret = WasmAttestVerification.__wrap(arg0);
            return ret;
        },
        __wbg_wasmdatabasecatalog_new: function(arg0) {
            const ret = WasmDatabaseCatalog.__wrap(arg0);
            return ret;
        },
        __wbg_wasmdatabaseproof_new: function(arg0) {
            const ret = WasmDatabaseProof.__wrap(arg0);
            return ret;
        },
        __wbg_wasmqueryresult_new: function(arg0) {
            const ret = WasmQueryResult.__wrap(arg0);
            return ret;
        },
        __wbg_wasmsyncresult_new: function(arg0) {
            const ret = WasmSyncResult.__wrap(arg0);
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 467, function: Function { arguments: [Externref], shim_idx: 468, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h490263039c0c107c, wasm_bindgen__convert__closures_____invoke__h9bbb2438131d711c);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 641, function: Function { arguments: [NamedExternref("ErrorEvent")], shim_idx: 642, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h13a6b95fd26262cb, wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 641, function: Function { arguments: [NamedExternref("Event")], shim_idx: 642, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h13a6b95fd26262cb, wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_2);
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 641, function: Function { arguments: [NamedExternref("MessageEvent")], shim_idx: 642, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h13a6b95fd26262cb, wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_3);
            return ret;
        },
        __wbindgen_cast_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 641, function: Function { arguments: [], shim_idx: 644, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h13a6b95fd26262cb, wasm_bindgen__convert__closures_____invoke__hc39032372d75848d);
            return ret;
        },
        __wbindgen_cast_0000000000000006: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000007: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000008: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000009: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_000000000000000a: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./pir_sdk_wasm_bg.js": import0,
    };
}

function wasm_bindgen__convert__closures_____invoke__hc39032372d75848d(arg0, arg1) {
    wasm.wasm_bindgen__convert__closures_____invoke__hc39032372d75848d(arg0, arg1);
}

function wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_2(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_2(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_3(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h016d06f3304ff2df_3(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h9bbb2438131d711c(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h9bbb2438131d711c(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen__convert__closures_____invoke__h1227e1e7bfd44bf9(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures_____invoke__h1227e1e7bfd44bf9(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_BinaryType = ["blob", "arraybuffer"];
const WasmAnnounceVerificationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmannounceverification_free(ptr >>> 0, 1));
const WasmArcCredentialFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmarccredential_free(ptr >>> 0, 1));
const WasmArcCredentialRequestFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmarccredentialrequest_free(ptr >>> 0, 1));
const WasmAtomicMetricsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmatomicmetrics_free(ptr >>> 0, 1));
const WasmAttestVerificationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmattestverification_free(ptr >>> 0, 1));
const WasmBucketMerkleTreeTopsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmbucketmerkletreetops_free(ptr >>> 0, 1));
const WasmDatabaseCatalogFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmdatabasecatalog_free(ptr >>> 0, 1));
const WasmDatabaseProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmdatabaseproof_free(ptr >>> 0, 1));
const WasmDpfClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmdpfclient_free(ptr >>> 0, 1));
const WasmHarmonyClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmharmonyclient_free(ptr >>> 0, 1));
const WasmOramClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmoramclient_free(ptr >>> 0, 1));
const WasmPolicyRequirementsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmpolicyrequirements_free(ptr >>> 0, 1));
const WasmQueryResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmqueryresult_free(ptr >>> 0, 1));
const WasmStandaloneSecureChannelV1Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmstandalonesecurechannelv1_free(ptr >>> 0, 1));
const WasmSyncPlanFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmsyncplan_free(ptr >>> 0, 1));
const WasmSyncResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmsyncresult_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            state.dtor(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('pir_sdk_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
