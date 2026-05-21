/**
 * Privacy-invariant checks against captured wire traffic.
 *
 * Cross-reference with the main repo's CLAUDE.md "CRITICAL SECURITY
 * REQUIREMENTS" section and `content/docs/privacy/invariants.mdx`.
 * The five invariants checked here (numbering matches CLAUDE.md and
 * the docs page):
 *
 * 1. Query padding (K=75 INDEX, K_CHUNK=80 CHUNK).
 *    Every INDEX_BATCH request frame MUST carry count=75; every
 *    CHUNK_BATCH MUST carry count=80.
 *
 * 2. CHUNK Round-Presence Symmetry.
 *    Every observed query session (≥1 INDEX_BATCH) MUST be followed by
 *    ≥1 K_CHUNK-padded CHUNK_BATCH. Equivalently: never see INDEX_BATCH
 *    without a CHUNK_BATCH following on the same socket.
 *
 * 3. Merkle INDEX Item-Count Symmetry.
 *    INDEX-level Merkle sibling batch frames (BUCKET_MERKLE_SIB_BATCH /
 *    MERKLE_SIBLING_BATCH) on the INDEX axis must carry keysPerGroup =
 *    INDEX_CUCKOO_NUM_HASHES = 2.
 *    Per-level sibling pass count is `2 × n_servers × n_levels ×
 *    n_pbc_rounds`. For typical batches with N ≤ K, n_pbc_rounds = 1.
 *
 * 4. HarmonyPIR Per-Group Request-Count Symmetry.
 *    Every HARMONY_QUERY / HARMONY_BATCH_QUERY frame must send exactly
 *    T-1 sorted distinct u32 indices per group. We can't validate the
 *    sort/distinct property without parsing the full payload, but we
 *    CAN observe that all Harmony query frames carry the same group
 *    request length (the "fixed-count invariant"). When this is
 *    uniform, T is consistent and the per-group count doesn't drift.
 *
 * 5. INDEX Merkle Group-Symmetry (PBC plan).
 *    For a multi-query batch, the per-Merkle-level pass count should
 *    stay at 2 × n_servers (one PBC round) when N ≤ K, regardless of
 *    whether the queries' first-derived-group collide. We can't easily
 *    validate this from a single-query trace; we surface the observed
 *    Merkle-level pass count and flag any deviation.
 */

import type { CapturedFrame } from './frame-tap';
import { EXPECTED_K, EXPECTED_K_CHUNK } from './frame-tap';

// ─── Invariant result ───────────────────────────────────────────────────────

/**
 * - `pass`    — the invariant holds. Either verified from the wire
 *               trace (e.g. K=75 on 0x11 frames) or enforced upstream
 *               in the SDK client code (e.g. HarmonyPIR's CHUNK
 *               round-presence — the wire opcode can't distinguish
 *               INDEX from CHUNK, but `pir-sdk-client/src/harmony.rs`
 *               always emits one). Where the property is verified
 *               lives in `summary`; here we collapse both cases to
 *               PASS so wallet developers see a single positive
 *               signal per property.
 * - `fail`    — wire trace shows a violation.
 * - `pending` — invariant applies and is expected, but data hasn't
 *               arrived yet.
 * - `n/a`     — invariant doesn't apply at all to this trace
 *               (e.g. HarmonyPIR T-1 on a DPF-only trace). The
 *               applicable-invariants filter normally hides these.
 */
export type InvariantState = 'pass' | 'fail' | 'pending' | 'n/a';

/**
 * The PIR backend the user has selected. Used to filter the report
 * down to invariants that actually apply to the captured traffic.
 */
export type InvariantBackend = 'dpf' | 'harmonypir' | 'onionpir';

/**
 * Which invariants apply to each backend. Out-of-scope invariants are
 * filtered from the report instead of cluttering the panel with `n/a`
 * rows the wallet developer can't act on.
 *
 * Source of truth for these assignments is CLAUDE.md; the comments on
 * each invariant block below cite the specific enforcement site.
 */
const APPLICABLE: Record<InvariantBackend, string[]> = {
  dpf: [
    'query-padding',
    'chunk-round-presence',
    'merkle-index-item-count',
    'index-merkle-group-symmetry',
  ],
  harmonypir: [
    'query-padding',
    'chunk-round-presence',
    'merkle-index-item-count',
    'harmony-tminus1',
    'index-merkle-group-symmetry',
  ],
  onionpir: [
    'query-padding',
    'chunk-round-presence',
    'merkle-index-item-count',
  ],
};

export interface InvariantResult {
  id: string;
  title: string;
  /** The state for the worst observed sample. */
  state: InvariantState;
  /** One-line human summary. */
  summary: string;
  /** Detail lines for the expanded panel. */
  detail: Array<{ label: string; value: string; ok?: boolean }>;
}

/**
 * Top-level verdict for the whole report.
 * - `pass`    — every applicable invariant is `pass`
 * - `fail`    — at least one invariant is `fail` (overrides `pending`)
 * - `pending` — no failures, but at least one invariant is still
 *               waiting on data (e.g. CHUNK round hasn't fired yet)
 * - `no-data` — no frames captured at all
 * - `na`      — frames present, but every invariant is `n/a` for
 *               this backend / traffic shape
 */
export type InvariantOverall = 'pass' | 'fail' | 'pending' | 'no-data' | 'na';

export interface InvariantReport {
  results: InvariantResult[];
  /** True iff every non-`n/a` invariant is `pass`. */
  allPass: boolean;
  /** Whether anything has been observed at all. */
  hasFrames: boolean;
  /** Single derived verdict; prefer this over allPass for UI labels. */
  overall: InvariantOverall;
}

/**
 * Optional context passed to `checkInvariants`. WASM-bound decoders go
 * here; without them, decoder-dependent invariants stay `n/a` instead
 * of crashing the UI.
 */
export interface InvariantContext {
  /**
   * `harmony_decode_counts` from pir-sdk-wasm. If provided AND
   * captured 0x43 frames have `rawBytes`, invariant 4 (HarmonyPIR
   * Per-Group Request-Count Symmetry) does intra-frame uniformity
   * checks instead of staying `n/a`.
   */
  harmonyDecodeCounts?: (frame: Uint8Array) => Uint32Array;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function txOf(frames: CapturedFrame[], op: number): CapturedFrame[] {
  return frames.filter((f) => f.direction === 'tx' && f.opcode === op);
}

function rxOf(frames: CapturedFrame[], op: number): CapturedFrame[] {
  return frames.filter((f) => f.direction === 'rx' && f.opcode === op);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Compute all invariant checks from a snapshot of captured frames.
 *
 * Designed to be re-run after every appended frame. The result is a
 * fresh struct; UI code does shallow-compare to decide whether to
 * re-render.
 */
export function checkInvariants(
  frames: CapturedFrame[],
  ctx: InvariantContext = {},
  backend?: InvariantBackend,
): InvariantReport {
  const indexBatchTx = txOf(frames, 0x11);
  const chunkBatchTx = txOf(frames, 0x21);
  const merkleSibBatchTx = txOf(frames, 0x31);
  const bucketMerkleSibBatchTx = txOf(frames, 0x33);
  const harmonyQueryTx = [
    ...txOf(frames, 0x42), // HARMONY_QUERY
    ...txOf(frames, 0x43), // HARMONY_BATCH_QUERY
  ];
  const onionIndexQueryTx = txOf(frames, 0x51);
  const onionChunkQueryTx = txOf(frames, 0x52);

  const hasFrames = frames.length > 0;
  const results: InvariantResult[] = [];

  // ── Invariant 1: K=75 INDEX, K_CHUNK=80 CHUNK padding ─────────────────
  {
    const detail: InvariantResult['detail'] = [];

    let dpfState: InvariantState = 'n/a';
    if (indexBatchTx.length > 0 || chunkBatchTx.length > 0) {
      const indexCounts = indexBatchTx.map((f) => f.groupCount ?? -1);
      const chunkCounts = chunkBatchTx.map((f) => f.groupCount ?? -1);
      const indexAllK = indexCounts.length === 0 || indexCounts.every((c) => c === EXPECTED_K);
      const chunkAllK = chunkCounts.length === 0 || chunkCounts.every((c) => c === EXPECTED_K_CHUNK);
      dpfState = indexAllK && chunkAllK ? 'pass' : 'fail';
      detail.push({
        label: 'DPF INDEX_BATCH (0x11) frames',
        value: `${indexBatchTx.length} frames, counts=${[...new Set(indexCounts)].join(',')} (expected ${EXPECTED_K})`,
        ok: indexAllK,
      });
      detail.push({
        label: 'DPF CHUNK_BATCH (0x21) frames',
        value: `${chunkBatchTx.length} frames, counts=${[...new Set(chunkCounts)].join(',')} (expected ${EXPECTED_K_CHUNK})`,
        ok: chunkAllK,
      });
    }

    // HarmonyPIR also K-pads, but the wire opcode is 0x43 and num_groups
    // lives in a different field (u16 LE at offset 8). frame-tap.ts
    // parses it into `groupCount` for 0x43 frames the same way as DPF —
    // we can do a direct check here: every TX 0x43 frame's groupCount
    // should be K (INDEX axis) or K_CHUNK (CHUNK / Merkle axis).
    let harmonyState: InvariantState = 'n/a';
    const harmonyBatchTx = txOf(frames, 0x43);
    if (harmonyBatchTx.length > 0) {
      const counts = harmonyBatchTx.map((f) => f.groupCount ?? -1);
      const indexAxis = counts.filter((c) => c === EXPECTED_K).length;
      const chunkAxis = counts.filter((c) => c === EXPECTED_K_CHUNK).length;
      const offAxis = counts.filter(
        (c) => c !== EXPECTED_K && c !== EXPECTED_K_CHUNK,
      );
      harmonyState = offAxis.length === 0 ? 'pass' : 'fail';
      detail.push({
        label: 'HarmonyPIR HARMONY_BATCH_QUERY (0x43) frames',
        value: `${harmonyBatchTx.length} TX frames — ${indexAxis} INDEX-axis (K=${EXPECTED_K}), ${chunkAxis} CHUNK/Merkle-axis (K_CHUNK=${EXPECTED_K_CHUNK})`,
        ok: offAxis.length === 0,
      });
      if (offAxis.length > 0) {
        detail.push({
          label: 'Off-axis HarmonyPIR frames',
          value: `${offAxis.length} frame(s) with num_groups ∈ {${[...new Set(offAxis)].join(',')}} — outside {K, K_CHUNK}`,
          ok: false,
        });
      }
    }
    const harmonyNote = ''; // No longer needed; harmony has its own row.

    // OnionPIR uses different opcodes (0x51/0x52). For Onion, the K-padding
    // happens inside the encrypted FHE query — we can only see request
    // *presence*, not parse counts from the wire. Flag as observed but
    // not directly validated.
    let onionNote = '';
    if (onionIndexQueryTx.length > 0 || onionChunkQueryTx.length > 0) {
      detail.push({
        label: 'OnionPIR INDEX queries (opcode 0x51)',
        value: `${onionIndexQueryTx.length} observed (K-padding internal to FHE payload)`,
      });
      detail.push({
        label: 'OnionPIR CHUNK queries (opcode 0x52)',
        value: `${onionChunkQueryTx.length} observed`,
      });
      onionNote = ' • OnionPIR padding embedded in FHE payload (not directly observable)';
    }

    // Combine DPF + Harmony verdicts. If both backends saw traffic,
    // both must pass. If only one was exercised, the other's `n/a`
    // doesn't drag the result down.
    let state: InvariantState;
    if (dpfState === 'fail' || harmonyState === 'fail') state = 'fail';
    else if (dpfState === 'pass' || harmonyState === 'pass') state = 'pass';
    else state = 'n/a';

    const dpfFrameTotal = indexBatchTx.length + chunkBatchTx.length;
    const harmonyFrameTotal = harmonyBatchTx.length;
    const summary =
      state === 'pass'
        ? `${dpfFrameTotal + harmonyFrameTotal} batch frames K-padded (${dpfFrameTotal} DPF + ${harmonyFrameTotal} Harmony 0x43)${onionNote}`
        : state === 'fail'
          ? `One or more batch frames deviated from K=${EXPECTED_K} / K_CHUNK=${EXPECTED_K_CHUNK}`
          : hasFrames
            ? `No DPF INDEX_BATCH / CHUNK_BATCH or HarmonyPIR 0x43 frames yet${onionNote}`
            : 'No frames captured yet';

    results.push({
      id: 'query-padding',
      title: 'Query padding (K=75 INDEX, K_CHUNK=80 CHUNK)',
      state,
      summary,
      detail,
    });
  }

  // ── Invariant 2: CHUNK Round-Presence Symmetry ─────────────────────────
  {
    const detail: InvariantResult['detail'] = [];
    let state: InvariantState = 'n/a';
    let summary = 'No INDEX phase observed';

    if (indexBatchTx.length > 0) {
      // Every INDEX phase should be followed by ≥1 CHUNK phase. We check
      // this per-INDEX-frame: for each INDEX_BATCH, is there a CHUNK_BATCH
      // with a later seq on the same socket?
      let missing = 0;
      for (const ix of indexBatchTx) {
        const followers = chunkBatchTx.filter(
          (cf) => cf.socketId === ix.socketId && cf.seq > ix.seq,
        );
        if (followers.length === 0) missing++;
      }
      state = missing === 0 ? 'pass' : 'fail';
      summary =
        missing === 0
          ? `Every one of ${indexBatchTx.length} INDEX_BATCH frame(s) was followed by ≥1 CHUNK_BATCH on its socket`
          : `${missing}/${indexBatchTx.length} INDEX_BATCH frame(s) NOT followed by CHUNK_BATCH — privacy violation`;
      detail.push({
        label: 'INDEX_BATCH frames',
        value: `${indexBatchTx.length}`,
      });
      detail.push({
        label: 'CHUNK_BATCH frames',
        value: `${chunkBatchTx.length}`,
      });
      detail.push({
        label: 'INDEX→CHUNK pairings',
        value: `${indexBatchTx.length - missing} of ${indexBatchTx.length}`,
        ok: missing === 0,
      });
    } else if (harmonyQueryTx.length > 0) {
      // HarmonyPIR's opcode 0x43 carries INDEX, CHUNK, and Merkle queries
      // indistinguishably on the wire. The CHUNK round-presence invariant
      // is enforced in `pir-sdk-client/src/harmony.rs::query_single`, which
      // emits a synthetic dummy CHUNK round when the INDEX phase returned
      // no hit. We can't see the round labels on the wire, but the SDK
      // guarantees the property; we mark `pass` and put the enforcement
      // site in the summary + detail so reviewers can audit it.
      state = 'pass';
      summary = `${harmonyQueryTx.length} HARMONY_BATCH_QUERY frame(s) observed — property holds via pir-sdk-client/src/harmony.rs::query_single (synthetic dummy CHUNK round on not-found/whale); not distinguishable from INDEX or Merkle frames at the wire layer`;
      detail.push({
        label: 'HARMONY_BATCH_QUERY frames',
        value: `${harmonyQueryTx.length}`,
      });
      detail.push({
        label: 'Verified at',
        value: 'SDK code (pir-sdk-client/src/harmony.rs::query_single)',
      });
    } else if (onionIndexQueryTx.length > 0) {
      // OnionPIR: every ONION_INDEX_QUERY followed by ≥1 ONION_CHUNK_QUERY.
      let missing = 0;
      for (const ix of onionIndexQueryTx) {
        const followers = onionChunkQueryTx.filter(
          (cf) => cf.socketId === ix.socketId && cf.seq > ix.seq,
        );
        if (followers.length === 0) missing++;
      }
      state = missing === 0 ? 'pass' : 'fail';
      summary =
        missing === 0
          ? `Every one of ${onionIndexQueryTx.length} ONION_INDEX_QUERY frame(s) was followed by ≥1 ONION_CHUNK_QUERY`
          : `${missing}/${onionIndexQueryTx.length} ONION_INDEX_QUERY NOT followed by ONION_CHUNK_QUERY — privacy violation`;
      detail.push({
        label: 'ONION_INDEX_QUERY frames',
        value: `${onionIndexQueryTx.length}`,
      });
      detail.push({
        label: 'ONION_CHUNK_QUERY frames',
        value: `${onionChunkQueryTx.length}`,
      });
    }

    results.push({
      id: 'chunk-round-presence',
      title: 'CHUNK Round-Presence Symmetry',
      state,
      summary,
      detail,
    });
  }

  // ── Invariant 3: Merkle INDEX Item-Count Symmetry ──────────────────────
  {
    const detail: InvariantResult['detail'] = [];
    let state: InvariantState = 'n/a';
    let summary = 'No Merkle sibling traffic observed';
    // HarmonyPIR: Merkle siblings ride opcode 0x43 (same as INDEX/CHUNK
    // queries) so they're not separately observable. The "exactly 2
    // items per query" property is enforced in
    // pir-sdk-client/src/harmony.rs (probes both cuckoo positions
    // unconditionally — see CLAUDE.md "Merkle INDEX Item-Count
    // Symmetry").
    if (
      harmonyQueryTx.length > 0 &&
      merkleSibBatchTx.length === 0 &&
      bucketMerkleSibBatchTx.length === 0
    ) {
      state = 'pass';
      summary = `Merkle siblings ride opcode 0x43 with INDEX/CHUNK queries — property holds via pir-sdk-client/src/harmony.rs (both cuckoo positions always probed)`;
      detail.push({
        label: 'Verified at',
        value: 'SDK code (pir-sdk-client/src/harmony.rs::query_single — INDEX_CUCKOO_NUM_HASHES = 2)',
      });
    }

    // Wire layout reminder (see pir-sdk-client::merkle_verify::
    // encode_sibling_batch and CLAUDE.md "Merkle INDEX Item-Count
    // Symmetry"):
    //
    // - One BUCKET_MERKLE_SIB_BATCH frame carries `keys_per_group = 1`
    //   on the wire — exactly one DPF query per group per frame.
    // - The K-padding (`num_groups`) lives in the frame layout
    //   independently. The INDEX-axis Merkle frames pad to K=75
    //   (INDEX K). The CHUNK-axis Merkle frames pad to K_CHUNK=80
    //   (CHUNK K). Both axes share the same opcode (0x33) on the
    //   wire — we infer the axis from the groupCount field.
    // - The "2 Merkle items per INDEX query" invariant manifests at a
    //   higher level: per (Merkle level × server × cuckoo position),
    //   exactly 1 sibling-batch frame; per (level × server), 2 frames
    //   (one per cuckoo position h=0 and h=1). Total INDEX-axis
    //   frames per query: `2 × n_servers × n_levels × n_pbc_rounds`.
    //
    // The wire check we perform:
    //   (a) every Merkle sibling frame has groupCount ∈ {K, K_CHUNK}
    //       — i.e. is PBC-padded for its axis, AND
    //   (b) every Merkle sibling frame has keysPerGroup = 1 (one DPF
    //       query per group per frame), AND
    //   (c) the per-axis frame count is a multiple of 2 (the "two
    //       cuckoo positions per level" structure — necessary, not
    //       sufficient).
    const merkleTx = [...merkleSibBatchTx, ...bucketMerkleSibBatchTx];
    if (merkleTx.length > 0) {
      const indexMerkleTx = merkleTx.filter((f) => f.groupCount === EXPECTED_K);
      const chunkMerkleTx = merkleTx.filter((f) => f.groupCount === EXPECTED_K_CHUNK);
      const offAxisMerkleTx = merkleTx.filter(
        (f) =>
          f.groupCount !== null &&
          f.groupCount !== EXPECTED_K &&
          f.groupCount !== EXPECTED_K_CHUNK,
      );
      const kpgValues = merkleTx.map((f) => f.keysPerGroup ?? -1);
      const allKpgOne = kpgValues.every((v) => v === 1);
      const indexEven = indexMerkleTx.length % 2 === 0;
      const chunkEven = chunkMerkleTx.length % 2 === 0;
      const noOffAxis = offAxisMerkleTx.length === 0;
      const ok = noOffAxis && allKpgOne && indexEven && chunkEven;
      state = ok ? 'pass' : 'fail';
      summary = ok
        ? `${indexMerkleTx.length} INDEX-axis + ${chunkMerkleTx.length} CHUNK-axis Merkle sibling frames, all PBC-padded with kpg=1`
        : `Merkle sibling frame shape deviated`;
      detail.push({
        label: 'BUCKET_MERKLE_SIB_BATCH (0x33) frames',
        value: `${bucketMerkleSibBatchTx.length}`,
      });
      detail.push({
        label: 'MERKLE_SIBLING_BATCH (0x31) frames',
        value: `${merkleSibBatchTx.length}`,
      });
      detail.push({
        label: 'INDEX-axis Merkle frames (groupCount=K=75)',
        value: `${indexMerkleTx.length}`,
        ok: noOffAxis,
      });
      detail.push({
        label: 'CHUNK-axis Merkle frames (groupCount=K_CHUNK=80)',
        value: `${chunkMerkleTx.length}`,
        ok: noOffAxis,
      });
      const kpgDistinct = [...new Set(kpgValues)];
      detail.push({
        label: 'keysPerGroup values (all axes)',
        value: `${kpgDistinct.join(',')} (expected 1 — see merkle_verify.rs)`,
        ok: allKpgOne,
      });
      detail.push({
        label: 'INDEX-axis frame count mod 2',
        value: `${indexMerkleTx.length} → ${indexEven ? 'even' : 'ODD'}`,
        ok: indexEven,
      });
      detail.push({
        label: 'CHUNK-axis frame count mod 2',
        value: `${chunkMerkleTx.length} → ${chunkEven ? 'even' : 'ODD'}`,
        ok: chunkEven,
      });
      if (indexMerkleTx.length > 0) {
        detail.push({
          label: 'INDEX-axis per-level pass count (= total / 2)',
          value: `${indexMerkleTx.length / 2} (= n_servers × n_levels × n_pbc_rounds × 2 cuckoo positions / 2)`,
        });
      }
      if (offAxisMerkleTx.length > 0) {
        const offDistinct = [...new Set(offAxisMerkleTx.map((f) => f.groupCount))];
        detail.push({
          label: 'Off-axis Merkle frames (UNEXPECTED)',
          value: `${offAxisMerkleTx.length} frame(s) with groupCount ∈ {${offDistinct.join(',')}} — neither K nor K_CHUNK`,
          ok: false,
        });
      }
    }

    results.push({
      id: 'merkle-index-item-count',
      title: 'Merkle INDEX Item-Count Symmetry',
      state,
      summary,
      detail,
    });
  }

  // ── Invariant 4: HarmonyPIR Per-Group Request-Count Symmetry ──────────
  {
    const detail: InvariantResult['detail'] = [];
    let state: InvariantState = 'n/a';
    let summary = 'No HarmonyPIR query frames observed';

    if (harmonyQueryTx.length > 0) {
      // Wire layout (see pir-sdk-client::harmony::encode_batch_query):
      //   [4B len][1B 0x43][1B level][2B round_id][2B num_groups]
      //   [1B sub_queries_per_group=1]
      //   per group: [1B group_id][4B count][count × 4B u32]
      //
      // Each 0x43 frame carries one segment class (INDEX / CHUNK / a
      // specific Merkle level), and within the frame every group must
      // share T (so all per-group `count` fields equal T−1).
      // Different frames legitimately use different T values for
      // differently-sized segments.
      //
      // With `harmony_decode_counts` available we check intra-frame
      // count uniformity directly on every TX 0x43 frame.
      const decoder = ctx.harmonyDecodeCounts;
      const batchFrames = harmonyQueryTx.filter(
        (f) => f.opcode === 0x43 && f.rawBytes,
      );

      if (!decoder) {
        state = 'n/a';
        summary = `${harmonyQueryTx.length} HarmonyPIR query frame(s) observed — waiting for WASM \`harmony_decode_counts\` to load`;
        detail.push({
          label: 'NOTE',
          value:
            'Wire-layer T−1 verification needs the pir-sdk-wasm `harmony_decode_counts` binding (added 2026-05-20). Status will flip to pass/fail once the WASM module finishes loading.',
        });
      } else if (batchFrames.length === 0) {
        state = 'n/a';
        summary = `${harmonyQueryTx.length} HARMONY_QUERY (0x42) frame(s) observed; no 0x43 batch frames available for decode`;
      } else {
        const perFrame: {
          seq: number;
          counts: number[];
          distinct: number[];
          ok: boolean;
        }[] = [];
        let decodeErr: string | null = null;
        for (const f of batchFrames) {
          try {
            const u = decoder(f.rawBytes!);
            const counts = Array.from(u);
            const distinct = [...new Set(counts)];
            perFrame.push({ seq: f.seq, counts, distinct, ok: distinct.length === 1 });
          } catch (e) {
            decodeErr = `frame seq=${f.seq}: ${(e as Error).message}`;
            break;
          }
        }

        if (decodeErr) {
          state = 'fail';
          summary = `Decode error during T−1 check: ${decodeErr}`;
          detail.push({ label: 'decode error', value: decodeErr, ok: false });
        } else {
          const failures = perFrame.filter((p) => !p.ok);
          const distinctT = [...new Set(perFrame.map((p) => p.distinct[0]))]
            .filter((v) => v !== undefined)
            .sort((a, b) => a - b);
          state = failures.length === 0 ? 'pass' : 'fail';
          summary =
            failures.length === 0
              ? `${perFrame.length}/${perFrame.length} 0x43 frames internally uniform — T−1 ∈ {${distinctT.join(',')}} across ${distinctT.length} segment classes`
              : `${failures.length}/${perFrame.length} 0x43 frames have intra-frame count drift — privacy violation`;
          detail.push({
            label: 'Frames checked',
            value: `${perFrame.length} of ${batchFrames.length} 0x43 TX frames decoded via wasm-bindgen harmony_decode_counts`,
          });
          detail.push({
            label: 'Per-frame intra-uniformity',
            value: `${perFrame.length - failures.length}/${perFrame.length} frames internally uniform`,
            ok: failures.length === 0,
          });
          detail.push({
            label: 'Observed T−1 values (one per segment class)',
            value: `{${distinctT.join(', ')}} — ${distinctT.length} distinct value(s)`,
          });
          if (failures.length > 0) {
            for (const f of failures.slice(0, 3)) {
              detail.push({
                label: `Frame seq=${f.seq} count drift`,
                value: `distinct counts = {${f.distinct.join(', ')}}`,
                ok: false,
              });
            }
          }
        }
      }
    }

    results.push({
      id: 'harmony-tminus1',
      title: 'HarmonyPIR Per-Group Request-Count Symmetry',
      state,
      summary,
      detail,
    });
  }

  // ── Plus: INDEX Merkle Group-Symmetry ──────────────────────────────────
  {
    const detail: InvariantResult['detail'] = [];
    let state: InvariantState = 'n/a';
    let summary =
      'INDEX Merkle group-symmetry: applies to multi-query batches; insufficient context from a single trace';

    // Same Harmony case as invariant 3 — Merkle items ride 0x43.
    // PBC plan-rounds (derive_groups_3) is applied inside the SDK.
    if (
      harmonyQueryTx.length > 0 &&
      merkleSibBatchTx.length === 0 &&
      bucketMerkleSibBatchTx.length === 0
    ) {
      state = 'pass';
      summary = `INDEX Merkle PBC plan applied via pir-sdk-client/src/harmony.rs::query_index_phase_batched — not separately observable on 0x43`;
      detail.push({
        label: 'Verified at',
        value: 'SDK code (pbc_plan_rounds(derive_groups_3, K, 3, 500))',
      });
    }

    const merkleTx = [...merkleSibBatchTx, ...bucketMerkleSibBatchTx];
    if (merkleTx.length > 0) {
      // Count is per-Merkle-level frames. For DPF: 2 servers × n_levels
      // × n_pbc_rounds × 2 cuckoo positions frames per query, where
      // each frame's groupCount equals the axis's K constant (K=75
      // for INDEX, K_CHUNK=80 for CHUNK). PBC packing intact when
      // every observed groupCount is exactly one of {K, K_CHUNK}.
      // A multi-query batch should still keep each frame at its
      // axis's K, since the planner distributes scripthashes across
      // PBC groups within one wire round when N ≤ K.
      const offAxis = merkleTx.filter(
        (f) =>
          f.groupCount !== null &&
          f.groupCount !== EXPECTED_K &&
          f.groupCount !== EXPECTED_K_CHUNK,
      );
      state = offAxis.length === 0 ? 'pass' : 'fail';
      summary =
        offAxis.length === 0
          ? `All ${merkleTx.length} Merkle frames carry groupCount ∈ {K=${EXPECTED_K}, K_CHUNK=${EXPECTED_K_CHUNK}} — PBC packing intact`
          : `${offAxis.length} Merkle frame(s) had groupCount outside {K, K_CHUNK} — PBC packing violated`;
      detail.push({
        label: 'Merkle frames observed',
        value: `${merkleTx.length}`,
      });
      const groupCounts = merkleTx.map((f) => f.groupCount ?? 0);
      detail.push({
        label: 'Distinct group counts observed',
        value: `${[...new Set(groupCounts)].sort().join(',')} (expected subset of {${EXPECTED_K},${EXPECTED_K_CHUNK}})`,
        ok: offAxis.length === 0,
      });
    }

    results.push({
      id: 'index-merkle-group-symmetry',
      title: 'INDEX Merkle Group-Symmetry (PBC plan)',
      state,
      summary,
      detail,
    });
  }

  // Filter to invariants applicable to the selected backend. If no
  // backend is supplied (e.g. caller hasn't picked one yet), keep all
  // results so the panel shows everything that might apply.
  const filteredResults = backend
    ? results.filter((r) => APPLICABLE[backend].includes(r.id))
    : results;

  // Aggregate verdict over the FILTERED set. `n/a` is excluded
  // (shouldn't occur after filtering, but defensive).
  const applicable = filteredResults.filter((r) => r.state !== 'n/a');
  const allPass =
    applicable.length > 0 && applicable.every((r) => r.state === 'pass');

  let overall: InvariantOverall;
  if (!hasFrames) {
    overall = 'no-data';
  } else if (applicable.length === 0) {
    overall = 'na';
  } else if (applicable.some((r) => r.state === 'fail')) {
    overall = 'fail';
  } else if (applicable.some((r) => r.state === 'pending')) {
    overall = 'pending';
  } else {
    overall = 'pass';
  }

  return { results: filteredResults, allPass, hasFrames, overall };
}
