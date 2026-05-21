/**
 * Frame-tap: capture every WebSocket frame the PIR clients send and receive,
 * without modifying any vendor code.
 *
 * Strategy (Option A from the agent brief): monkey-patch `window.WebSocket`
 * with a Proxy-like subclass that records every `send()` and every received
 * `message` event into a CapturedFrame[] buffer. The DPF / HarmonyPIR /
 * OnionPIR adapters all open their own `new WebSocket(url)` instances and
 * never hold a reference to the global constructor, so the next time any of
 * them constructs a socket they pick up the patched version.
 *
 * Why monkey-patch rather than use `WasmAtomicMetrics`?
 * - `WasmAtomicMetrics` only exposes aggregate `bytesSent` / `framesSent`
 *   counters (see vendor/pir-sdk-wasm/pir_sdk_wasm.d.ts:338). We need
 *   per-frame breakdown — direction, opcode, byte size, payload preview.
 * - The WASM client (`pir-sdk-client/src/connection.rs`) owns its own
 *   transport `WsConnection`. There is no JS-side hook to inject a custom
 *   transport; the WASM constructs the socket internally. Monkey-patching
 *   `window.WebSocket` is the only way to see those frames from JS.
 *
 * The wire format (see vendor/bitcoinpir-web/protocol.ts):
 *   [4B len LE][1B opcode][payload...]
 *
 * For an INDEX_BATCH (opcode 0x11) request:
 *   [4B len][0x11][2B roundId LE][1B count = K = 75][1B keysPerGroup = 2][keys...]
 *
 * For a CHUNK_BATCH (opcode 0x21):
 *   [4B len][0x21][2B roundId LE][1B count = K_CHUNK = 80][1B keysPerGroup = 2][keys...]
 *
 * For a MerkleSiblingBatch (0x31) or BucketMerkleSibBatch (0x33):
 *   [4B len][opcode][2B roundId][1B count][1B keysPerGroup][keys...]
 *
 * Chunked frames (Cloudflare workaround, see vendor/bitcoinpir-web/ws.ts:38):
 *   [4B len][0xc7][2B seq LE][2B total LE][piece]
 *   Reassembled into a logical message before invariant inspection.
 */

import { K, K_CHUNK, INDEX_CUCKOO_NUM_HASHES } from '@vendor/web/constants';

// Re-export so consumers can import everything from this module.
export const EXPECTED_K = K;
export const EXPECTED_K_CHUNK = K_CHUNK;
export const EXPECTED_INDEX_CUCKOO_NUM_HASHES = INDEX_CUCKOO_NUM_HASHES;

// ─── Opcode dictionary ───────────────────────────────────────────────────────

/** Reverse map of every known protocol opcode → human-readable label. */
export const REQ_OPCODES: Record<number, string> = {
  0x00: 'PING',
  0x01: 'GET_INFO',
  0x02: 'GET_DB_CATALOG',
  0x03: 'GET_INFO_JSON',
  0x04: 'RESIDENCY',
  0x05: 'ATTEST',
  0x06: 'CHANNEL_HANDSHAKE',
  0x07: 'CHANNEL_FRAME',
  0x08: 'CRED_PRESENT',
  0x09: 'CASHU_BAT_PRESENT',
  0x11: 'INDEX_BATCH',
  0x21: 'CHUNK_BATCH',
  0x31: 'MERKLE_SIBLING_BATCH',
  0x32: 'MERKLE_TREE_TOP',
  0x33: 'BUCKET_MERKLE_SIB_BATCH',
  0x34: 'BUCKET_MERKLE_TREE_TOPS',
  0x40: 'HARMONY_GET_INFO',
  0x41: 'HARMONY_HINTS',
  0x42: 'HARMONY_QUERY',
  0x43: 'HARMONY_BATCH_QUERY',
  0x44: 'HARMONY_HINTS_V2',
  0x46: 'HARMONY_HINTS_V2_HALF',
  0x50: 'ONION_REGISTER_KEYS',
  0x51: 'ONION_INDEX_QUERY',
  0x52: 'ONION_CHUNK_QUERY',
  0x53: 'ONION_MERKLE_INDEX_SIBLING',
  0x54: 'ONION_MERKLE_INDEX_TREE_TOP',
  0x55: 'ONION_MERKLE_DATA_SIBLING',
  0x56: 'ONION_MERKLE_DATA_TREE_TOP',
};

export const RESP_OPCODES: Record<number, string> = {
  0x00: 'PONG',
  0x01: 'INFO',
  0x02: 'DB_CATALOG',
  0x03: 'INFO_JSON',
  0x04: 'RESIDENCY',
  0x05: 'ATTEST',
  0x06: 'CHANNEL_HANDSHAKE',
  0x07: 'CHANNEL_FRAME',
  0x08: 'CRED_OK',
  0x09: 'CASHU_BAT_OK',
  0x11: 'INDEX_BATCH',
  0x21: 'CHUNK_BATCH',
  0x31: 'MERKLE_SIBLING_BATCH',
  0x32: 'MERKLE_TREE_TOP',
  0x33: 'BUCKET_MERKLE_SIB_BATCH',
  0x34: 'BUCKET_MERKLE_TREE_TOPS',
  0x40: 'HARMONY_INFO',
  0x41: 'HARMONY_HINTS',
  0x42: 'HARMONY_QUERY',
  0x43: 'HARMONY_BATCH_QUERY',
  0x44: 'HARMONY_HINTS_KEY',
  0x50: 'ONION_KEYS_ACK',
  0x51: 'ONION_INDEX_RESULT',
  0x52: 'ONION_CHUNK_RESULT',
  0x53: 'ONION_MERKLE_INDEX_SIBLING',
  0x54: 'ONION_MERKLE_INDEX_TREE_TOP',
  0x55: 'ONION_MERKLE_DATA_SIBLING',
  0x56: 'ONION_MERKLE_DATA_TREE_TOP',
  0xff: 'ERROR',
};

/** Chunk-frame magic, see vendor/bitcoinpir-web/ws.ts (CHUNK_MAGIC). */
const CHUNK_MAGIC = 0xc7;

// ─── Captured-frame shape ────────────────────────────────────────────────────

export type FrameDirection = 'tx' | 'rx';

/** Light-weight per-frame record. Stored in a ring buffer. */
export interface CapturedFrame {
  /** Monotonic sequence across the whole tap session, 1-indexed. */
  seq: number;
  /** Capture timestamp (ms since tap start). */
  tMs: number;
  /** Which WS this frame belongs to. */
  socketId: number;
  /** ws:// or wss:// URL we observed. */
  socketUrl: string;
  /** tx = client→server, rx = server→client */
  direction: FrameDirection;
  /** Total bytes on the wire (including length prefix). */
  size: number;
  /** Opcode byte at offset 4 (after length prefix), or null if pre-length. */
  opcode: number | null;
  /** Resolved opcode label, e.g. "INDEX_BATCH" / "PONG". */
  label: string;
  /** True iff this is a sub-frame of a chunked logical message. */
  isChunkPart: boolean;
  /**
   * For INDEX_BATCH / CHUNK_BATCH / Merkle batch requests, the parsed
   * `count` field. This is exactly K / K_CHUNK / etc. per the privacy
   * invariants. `null` for other frames.
   */
  groupCount: number | null;
  /**
   * For INDEX_BATCH / CHUNK_BATCH / Merkle batch requests, the parsed
   * `keysPerGroup` field. For INDEX this is INDEX_CUCKOO_NUM_HASHES = 2.
   * `null` for other frames.
   */
  keysPerGroup: number | null;
  /** First 32 raw bytes hex-encoded for the UI preview column. */
  hexPreview: string;
  /**
   * Full raw bytes, copied at capture time. Only retained for opcodes
   * that have a JS-side decoder (currently TX 0x42 HARMONY_QUERY and
   * TX 0x43 HARMONY_BATCH_QUERY — consumed by `harmony_decode_counts`
   * for the Per-Group Request-Count Symmetry invariant). Undefined
   * for all other frames to avoid retaining ~MB-scale payloads.
   */
  rawBytes?: Uint8Array;
}

function shouldKeepRawBytes(opcode: number | null, direction: FrameDirection): boolean {
  if (direction !== 'tx' || opcode === null) return false;
  return opcode === 0x42 || opcode === 0x43;
}

// ─── Parsing one frame's leading bytes ───────────────────────────────────────

function bytesToHex(buf: Uint8Array, max = 32): string {
  const slice = buf.subarray(0, Math.min(max, buf.length));
  let s = '';
  for (let i = 0; i < slice.length; i++) {
    s += slice[i].toString(16).padStart(2, '0');
    if (i < slice.length - 1) s += ' ';
  }
  if (buf.length > max) s += ` … (+${buf.length - max} bytes)`;
  return s;
}

/**
 * Parse a single raw WebSocket frame against our wire-format expectations.
 * Returns the opcode label and any K/keysPerGroup we can extract.
 *
 * This is deliberately permissive — frames we don't recognise simply yield
 * `opcode = null`. The frame is still recorded for inspection.
 */
function classify(
  raw: Uint8Array,
  direction: FrameDirection,
): {
  opcode: number | null;
  label: string;
  isChunkPart: boolean;
  groupCount: number | null;
  keysPerGroup: number | null;
} {
  if (raw.length < 5) {
    return {
      opcode: null,
      label: '(short frame)',
      isChunkPart: false,
      groupCount: null,
      keysPerGroup: null,
    };
  }

  const op = raw[4];

  // Chunk continuation frame (Cloudflare workaround). We treat each chunk
  // piece as a separate frame for display, but tag it as such.
  if (op === CHUNK_MAGIC) {
    return {
      opcode: op,
      label: 'CHUNK_PART',
      isChunkPart: true,
      groupCount: null,
      keysPerGroup: null,
    };
  }

  const dict = direction === 'tx' ? REQ_OPCODES : RESP_OPCODES;
  const label = dict[op] ?? `UNKNOWN_0x${op.toString(16).padStart(2, '0')}`;

  // INDEX / CHUNK / Merkle batch frames carry [count, keysPerGroup] at
  // offset 7,8 of the raw bytes ([4B len][1B op][2B roundId][1B count][1B kpg]).
  let groupCount: number | null = null;
  let keysPerGroup: number | null = null;
  const isBatchRequest =
    direction === 'tx' &&
    (op === 0x11 || op === 0x21 || op === 0x31 || op === 0x33);
  if (isBatchRequest && raw.length >= 9) {
    groupCount = raw[7];
    keysPerGroup = raw[8];
  }
  // HARMONY_BATCH_QUERY (0x43) uses a different wire layout:
  //   [4B len][1B 0x43][1B level][2B round_id][2B num_groups]
  //   [1B sub_queries_per_group=1][per-group entries…]
  // num_groups is u16 LE at byte offset 8; sub_queries_per_group is byte 10.
  if (direction === 'tx' && op === 0x43 && raw.length >= 11) {
    groupCount = raw[8] | (raw[9] << 8);
    keysPerGroup = raw[10];
  }

  return {
    opcode: op,
    label,
    isChunkPart: false,
    groupCount,
    keysPerGroup,
  };
}

// ─── The tap itself ──────────────────────────────────────────────────────────

/** Callback invoked on every captured frame (after recording). */
export type FrameListener = (frame: CapturedFrame) => void;

/**
 * Lifetime: one FrameTap covers one query session. Construct, attach to the
 * global `window.WebSocket`, run a query, then `dispose()` to restore the
 * original constructor.
 *
 * Multiple FrameTaps can be created sequentially — only one is "active"
 * (attached to window.WebSocket) at a time.
 */
export class FrameTap {
  private frames: CapturedFrame[] = [];
  private listeners: Set<FrameListener> = new Set();
  private startedAt = 0;
  private nextSocketId = 1;
  private nextSeq = 1;
  private originalWebSocket: typeof WebSocket | null = null;
  private patchedClass: typeof WebSocket | null = null;
  private disposed = false;

  /** Snapshot of the captured frames so far (cheap shallow copy). */
  snapshot(): CapturedFrame[] {
    return this.frames.slice();
  }

  /** Add a listener; returns an unsubscribe function. */
  addListener(fn: FrameListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Clear the in-memory buffer without removing the patch. */
  reset(): void {
    this.frames = [];
    this.nextSeq = 1;
    this.startedAt = performance.now();
  }

  /**
   * Install the patch on `window.WebSocket`. After this call, any code
   * that does `new WebSocket(url)` produces an unwrapped real socket
   * whose `send` is intercepted and whose `addEventListener('message')`
   * is augmented with our recorder.
   *
   * Implementation note: we deliberately do NOT trap `onmessage`. The
   * wasm-bindgen-owned client assigns a `Closure` to that property and
   * is sensitive to wrapping: a wrapper that calls the inner closure
   * synchronously inside a message-event handler triggers wasm-bindgen's
   * "closure invoked recursively or after being dropped" reentrancy
   * panic. Adding an *independent* `addEventListener('message', …)`
   * listener — never invoking the wasm closure ourselves — is safe.
   *
   * Idempotent: calling twice is a no-op.
   */
  attach(): void {
    if (this.disposed) throw new Error('FrameTap already disposed');
    if (typeof window === 'undefined') {
      throw new Error('FrameTap.attach must run in the browser');
    }
    if (this.patchedClass) return;

    this.startedAt = performance.now();
    this.originalWebSocket = window.WebSocket;
    const Original = this.originalWebSocket;
    const tap = this;

    function recordRx(socketId: number, url: string, data: unknown): void {
      if (tap.disposed) return;
      if (data instanceof ArrayBuffer) {
        tap.record(socketId, url, 'rx', new Uint8Array(data));
      } else if (data instanceof Blob) {
        data.arrayBuffer().then((ab) => {
          if (!tap.disposed) {
            tap.record(socketId, url, 'rx', new Uint8Array(ab));
          }
        });
      } else if (typeof data === 'string') {
        tap.record(socketId, url, 'rx', new TextEncoder().encode(data));
      }
    }

    // Use a constructor function (not class extends + override) so we
    // never wrap the wasm-bindgen-assigned `onmessage` closure. The
    // patched constructor builds a real WebSocket, attaches our
    // listeners *before* the wasm-bindgen `onmessage = closure`
    // assignment runs, and returns the real socket unchanged. The
    // browser dispatches every message event to both our listener AND
    // the wasm-bindgen `onmessage` slot — both fire, no wrapping.
    const Patched = function PatchedWebSocket(
      url: string | URL,
      protocols?: string | string[],
    ): WebSocket {
      const ws = new Original(url, protocols);
      const socketId = tap.nextSocketId++;
      const socketUrl = typeof url === 'string' ? url : url.toString();

      // ── TX: override send via a per-instance closure ─────────────
      const origSend = ws.send.bind(ws);
      (ws as { send: unknown }).send = function patchedSend(
        payload: string | ArrayBufferLike | Blob | ArrayBufferView,
      ) {
        if (!tap.disposed) {
          let view: Uint8Array | null = null;
          if (payload instanceof ArrayBuffer) {
            view = new Uint8Array(payload);
          } else if (ArrayBuffer.isView(payload)) {
            view = new Uint8Array(
              payload.buffer,
              payload.byteOffset,
              payload.byteLength,
            );
          } else if (typeof payload === 'string') {
            view = new TextEncoder().encode(payload);
          }
          if (view) tap.record(socketId, socketUrl, 'tx', view);
        }
        return origSend(payload);
      };

      // ── RX: independent `addEventListener('message', …)` ─────────
      // Spec: message events dispatch to BOTH addEventListener listeners
      // AND the assigned `onmessage` property. Adding our own listener
      // gives us a guaranteed RX recording slot without ever touching
      // the wasm-bindgen-owned closure.
      ws.addEventListener('message', (ev) => {
        recordRx(socketId, socketUrl, (ev as MessageEvent).data);
      });

      return ws;
    } as unknown as typeof WebSocket;
    // Preserve `instanceof WebSocket` checks.
    Patched.prototype = Original.prototype;
    // Mirror the static readyState constants. Without this, JS callers
    // that branch on `WebSocket.OPEN` etc. (e.g. the hand-rolled
    // `ManagedWebSocket.sendRaw` in `vendor/bitcoinpir-web/ws.ts`) see
    // `undefined` and falsely conclude the socket is closed. The
    // wasm-bindgen DPF/Harmony clients have their own readyState
    // plumbing so they were not affected, which made the OnionPIR-
    // only explorer regression look like a server-side close.
    (Patched as any).CONNECTING = (Original as any).CONNECTING;
    (Patched as any).OPEN = (Original as any).OPEN;
    (Patched as any).CLOSING = (Original as any).CLOSING;
    (Patched as any).CLOSED = (Original as any).CLOSED;

    this.patchedClass = Patched;
    window.WebSocket = Patched;
  }

  /**
   * Restore the original `window.WebSocket`. Idempotent. After
   * `dispose()` the tap is dead — further frames are not recorded
   * (defensive, in case the patch isn't fully unwound by the browser).
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (
      this.originalWebSocket &&
      typeof window !== 'undefined' &&
      window.WebSocket === this.patchedClass
    ) {
      window.WebSocket = this.originalWebSocket;
    }
    this.originalWebSocket = null;
    this.patchedClass = null;
    this.listeners.clear();
  }

  private record(
    socketId: number,
    socketUrl: string,
    direction: FrameDirection,
    raw: Uint8Array,
  ): void {
    const tMs = Math.round(performance.now() - this.startedAt);
    const klass = classify(raw, direction);
    const frame: CapturedFrame = {
      seq: this.nextSeq++,
      tMs,
      socketId,
      socketUrl,
      direction,
      size: raw.length,
      opcode: klass.opcode,
      label: klass.label,
      isChunkPart: klass.isChunkPart,
      groupCount: klass.groupCount,
      keysPerGroup: klass.keysPerGroup,
      hexPreview: bytesToHex(raw, 32),
    };
    if (shouldKeepRawBytes(klass.opcode, direction)) {
      // Copy detaches from any reused ArrayBuffer the WS may recycle.
      frame.rawBytes = new Uint8Array(raw);
    }
    this.frames.push(frame);
    // Snapshot listeners so a listener that disposes doesn't break iteration.
    const ls = Array.from(this.listeners);
    for (const fn of ls) {
      try {
        fn(frame);
      } catch (err) {
        // Listener errors must not break the tap.
        console.error('[FrameTap] listener error', err);
      }
    }
  }
}
