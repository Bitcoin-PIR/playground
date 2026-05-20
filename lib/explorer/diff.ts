/**
 * Found-vs-not-found wire-shape diff.
 *
 * The privacy claim: server traffic for a "found" query and a "not-found"
 * query must be indistinguishable on the wire (same opcode sequence, same
 * byte counts per opcode, same group counts and keys-per-group). This
 * module reduces two captured-frame sequences down to a comparison
 * profile and emits a diff.
 *
 * Cross-reference: vendor/bitcoinpir-web/leakage.ts defines the same shape
 * on the protocol level (RoundProfile), used by the main repo's
 * integration tests. We work one layer below — directly on
 * CapturedFrame[] — so the diff catches the wire shape, not just the
 * RoundProfile bookkeeping the SDK chooses to emit.
 */

import type { CapturedFrame } from './frame-tap';

// ─── Profile shape ──────────────────────────────────────────────────────────

/**
 * Aggregated counters per (direction, opcode). Two queries with the same
 * wire shape produce equal `WireProfile` objects under
 * `wireProfilesEqual`.
 */
export interface WireProfile {
  /** Total bytes sent across the wire for this query. */
  totalBytesTx: number;
  /** Total bytes received. */
  totalBytesRx: number;
  /** Total frames sent. */
  totalFramesTx: number;
  /** Total frames received. */
  totalFramesRx: number;
  /**
   * Per-opcode breakdown, keyed by `"tx:opcode"` or `"rx:opcode"`.
   * Each entry sums the frame count and byte count.
   */
  perOp: Record<
    string,
    { direction: 'tx' | 'rx'; opcode: number; label: string; frames: number; bytes: number }
  >;
  /**
   * Per-opcode list of `groupCount` values observed. Should be identical
   * across found/not-found.
   */
  groupCountByOp: Record<string, number[]>;
}

/** Reduce a frame sequence to a WireProfile. */
export function profile(frames: CapturedFrame[]): WireProfile {
  const out: WireProfile = {
    totalBytesTx: 0,
    totalBytesRx: 0,
    totalFramesTx: 0,
    totalFramesRx: 0,
    perOp: {},
    groupCountByOp: {},
  };
  for (const f of frames) {
    if (f.direction === 'tx') {
      out.totalBytesTx += f.size;
      out.totalFramesTx += 1;
    } else {
      out.totalBytesRx += f.size;
      out.totalFramesRx += 1;
    }
    if (f.opcode === null) continue;
    const key = `${f.direction}:${f.opcode}`;
    const entry = out.perOp[key];
    if (entry) {
      entry.frames += 1;
      entry.bytes += f.size;
    } else {
      out.perOp[key] = {
        direction: f.direction,
        opcode: f.opcode,
        label: f.label,
        frames: 1,
        bytes: f.size,
      };
    }
    if (f.groupCount !== null) {
      const arr = out.groupCountByOp[key] ?? [];
      arr.push(f.groupCount);
      out.groupCountByOp[key] = arr;
    }
  }
  return out;
}

// ─── Diff ───────────────────────────────────────────────────────────────────

/** One row in the diff table. */
export interface DiffRow {
  label: string;
  found: string;
  notFound: string;
  /** True iff the two values match exactly. */
  same: boolean;
}

/** A full diff: a list of rows + an overall pass/fail. */
export interface ProfileDiff {
  rows: DiffRow[];
  identical: boolean;
}

function arrEq<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Compare two wire profiles for a found-vs-not-found query pair.
 *
 * What we expect from a privacy-preserving PIR:
 *   - Total bytes Tx/Rx identical
 *   - Total frame counts identical
 *   - Per-opcode frame counts and byte counts identical
 *   - Per-opcode groupCount distributions identical (the K-padding axis)
 *
 * If any of these differ, that's a leak.
 */
export function diffProfiles(found: WireProfile, notFound: WireProfile): ProfileDiff {
  const rows: DiffRow[] = [];

  rows.push({
    label: 'Total bytes (client → server)',
    found: `${found.totalBytesTx}`,
    notFound: `${notFound.totalBytesTx}`,
    same: found.totalBytesTx === notFound.totalBytesTx,
  });
  rows.push({
    label: 'Total bytes (server → client)',
    found: `${found.totalBytesRx}`,
    notFound: `${notFound.totalBytesRx}`,
    same: found.totalBytesRx === notFound.totalBytesRx,
  });
  rows.push({
    label: 'Total frames sent',
    found: `${found.totalFramesTx}`,
    notFound: `${notFound.totalFramesTx}`,
    same: found.totalFramesTx === notFound.totalFramesTx,
  });
  rows.push({
    label: 'Total frames received',
    found: `${found.totalFramesRx}`,
    notFound: `${notFound.totalFramesRx}`,
    same: found.totalFramesRx === notFound.totalFramesRx,
  });

  // Union of opcodes across the two profiles.
  const keys = new Set([...Object.keys(found.perOp), ...Object.keys(notFound.perOp)]);
  const sortedKeys = Array.from(keys).sort((a, b) => {
    const ea = found.perOp[a] ?? notFound.perOp[a];
    const eb = found.perOp[b] ?? notFound.perOp[b];
    if (!ea || !eb) return a.localeCompare(b);
    if (ea.direction !== eb.direction) return ea.direction === 'tx' ? -1 : 1;
    return ea.opcode - eb.opcode;
  });
  for (const key of sortedKeys) {
    const f = found.perOp[key];
    const n = notFound.perOp[key];
    const label = (f ?? n)?.label ?? key;
    const dir = (f ?? n)?.direction ?? '';
    const fStr = f ? `${f.frames}x / ${f.bytes}B` : '—';
    const nStr = n ? `${n.frames}x / ${n.bytes}B` : '—';
    rows.push({
      label: `[${dir}] ${label} frame×count / bytes`,
      found: fStr,
      notFound: nStr,
      same:
        (f?.frames ?? 0) === (n?.frames ?? 0) &&
        (f?.bytes ?? 0) === (n?.bytes ?? 0),
    });

    const gf = found.groupCountByOp[key] ?? [];
    const gn = notFound.groupCountByOp[key] ?? [];
    if (gf.length > 0 || gn.length > 0) {
      rows.push({
        label: `  ↳ ${label} groupCount sequence`,
        found: gf.length > 0 ? gf.join(',') : '—',
        notFound: gn.length > 0 ? gn.join(',') : '—',
        same: arrEq(gf, gn),
      });
    }
  }

  const identical = rows.every((r) => r.same);
  return { rows, identical };
}
