/**
 * Privacy-invariant checks against captured wire traffic.
 *
 * Cross-reference with the main repo's CLAUDE.md "CRITICAL SECURITY
 * REQUIREMENTS" section. The four invariants checked here:
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
 * Plus:
 * 5. INDEX Merkle Group-Symmetry.
 *    For a multi-query batch, the per-Merkle-level pass count should
 *    stay at 2 × n_servers (one PBC round) when N ≤ K, regardless of
 *    whether the queries' first-derived-group collide. We can't easily
 *    validate this from a single-query trace; we surface the observed
 *    Merkle-level pass count and flag any deviation.
 */

import type { CapturedFrame } from './frame-tap';
import {
  EXPECTED_K,
  EXPECTED_K_CHUNK,
  EXPECTED_INDEX_CUCKOO_NUM_HASHES,
} from './frame-tap';

// ─── Invariant result ───────────────────────────────────────────────────────

export type InvariantState = 'pass' | 'fail' | 'pending' | 'n/a';

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

export interface InvariantReport {
  results: InvariantResult[];
  /** True iff every non-`n/a` invariant is `pass`. */
  allPass: boolean;
  /** Whether anything has been observed at all. */
  hasFrames: boolean;
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
export function checkInvariants(frames: CapturedFrame[]): InvariantReport {
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
        label: 'DPF / HarmonyPIR INDEX frames',
        value: `${indexBatchTx.length} frames, counts=${[...new Set(indexCounts)].join(',')} (expected ${EXPECTED_K})`,
        ok: indexAllK,
      });
      detail.push({
        label: 'DPF / HarmonyPIR CHUNK frames',
        value: `${chunkBatchTx.length} frames, counts=${[...new Set(chunkCounts)].join(',')} (expected ${EXPECTED_K_CHUNK})`,
        ok: chunkAllK,
      });
    }

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

    const state: InvariantState = dpfState;
    const summary =
      state === 'pass'
        ? `All ${indexBatchTx.length + chunkBatchTx.length} batch frames padded to K=${EXPECTED_K} / K_CHUNK=${EXPECTED_K_CHUNK}${onionNote}`
        : state === 'fail'
          ? `One or more batch frames deviated from the expected padding`
          : hasFrames
            ? `No DPF/Harmony INDEX/CHUNK frames observed yet${onionNote}`
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
      // The HarmonyPIR request body is K (or K_CHUNK) groups, each a
      // sorted u32 array of length T-1. The total request size must be
      // identical across every same-phase query if T is fixed.
      // We can detect drift by checking that all same-opcode frames are
      // the same byte size.
      const sizesByOp = new Map<number, number[]>();
      for (const f of harmonyQueryTx) {
        const op = f.opcode!;
        const arr = sizesByOp.get(op) ?? [];
        arr.push(f.size);
        sizesByOp.set(op, arr);
      }

      let drifted = 0;
      for (const [op, sizes] of sizesByOp) {
        const distinct = [...new Set(sizes)];
        if (distinct.length > 1) drifted++;
        detail.push({
          label: `Opcode 0x${op.toString(16).padStart(2, '0')} frame sizes`,
          value: `${distinct.join(',')} bytes (${sizes.length} frame(s))`,
          ok: distinct.length === 1,
        });
      }
      state = drifted === 0 ? 'pass' : 'fail';
      summary =
        drifted === 0
          ? `All ${harmonyQueryTx.length} HarmonyPIR query frames have a uniform on-wire size (T fixed)`
          : `${drifted} HarmonyPIR opcode(s) showed size drift — per-group count is leaking`;
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

  // Aggregate
  const nonNa = results.filter((r) => r.state !== 'n/a');
  const allPass = nonNa.length > 0 && nonNa.every((r) => r.state === 'pass');

  return { results, allPass, hasFrames };
}
