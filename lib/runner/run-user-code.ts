'use client';

/**
 * Transpile + execute user-authored TypeScript ENTIRELY in the browser.
 *
 *   1. Sucrase strips the TS types and rewrites ESM `import`s to CommonJS
 *      `require(...)` calls. (Sucrase parses multi-line imports correctly — a
 *      naive regex strip would mangle the snippet's wrapped imports.)
 *   2. The result runs inside `new Function` with:
 *        - a `require` shim bound to `buildModuleMap()` (the same live SDK
 *          bindings the structured runner uses),
 *        - a captured `console` so output lands in the runner panel, and
 *        - an async IIFE wrapper so the snippet's top-level `await` works.
 *
 * No code is sent anywhere to be compiled or evaluated. The only network
 * traffic is whatever the SDK itself performs (the WebSocket PIR query),
 * exactly as on the "Run query" path.
 */

import { transform } from 'sucrase';
import { buildModuleMap } from './module-map';

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface RunLogLine {
  level: LogLevel;
  text: string;
}

export interface RunOutcome {
  logs: RunLogLine[];
  /** `null` on success; otherwise the thrown message (or a compile error). */
  error: string | null;
  /** Wall-clock ms for the user code itself (excludes transpile + module load). */
  elapsedMs: number;
}

function formatArg(a: unknown): string {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return a.stack ?? `${a.name}: ${a.message}`;
  if (typeof a === 'bigint') return `${a}n`;
  if (a instanceof Uint8Array) {
    const head = Array.from(a.slice(0, 64), (b) => b.toString(16).padStart(2, '0')).join('');
    return `Uint8Array(${a.length}) ${head}${a.length > 64 ? '…' : ''}`;
  }
  try {
    const json = JSON.stringify(a, (_k, v) => (typeof v === 'bigint' ? `${v}n` : v), 2);
    return json ?? String(a);
  } catch {
    return String(a);
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function runUserCode(
  source: string,
  onLog?: (line: RunLogLine) => void,
): Promise<RunOutcome> {
  const logs: RunLogLine[] = [];
  const record = (level: LogLevel, args: unknown[]) => {
    const line: RunLogLine = { level, text: args.map(formatArg).join(' ') };
    logs.push(line);
    onLog?.(line);
  };
  // Prototype-chain to the real console so unspecified methods (table, group,
  // …) still work; capture the common ones into the panel.
  const sandboxConsole = Object.assign(Object.create(console) as Console, {
    log: (...a: unknown[]) => record('log', a),
    info: (...a: unknown[]) => record('info', a),
    warn: (...a: unknown[]) => record('warn', a),
    error: (...a: unknown[]) => record('error', a),
    debug: (...a: unknown[]) => record('log', a),
  });

  // 1. Transpile (TS types stripped, ESM imports -> require()).
  let js: string;
  try {
    js = transform(source, {
      transforms: ['typescript', 'imports'],
      preserveDynamicImport: true,
    }).code;
  } catch (e) {
    return { logs, error: `Compile error — ${errMsg(e)}`, elapsedMs: 0 };
  }

  // 2. Module map + require shim.
  let moduleMap;
  try {
    moduleMap = await buildModuleMap(source);
  } catch (e) {
    return { logs, error: `Failed to load SDK modules — ${errMsg(e)}`, elapsedMs: 0 };
  }
  const requireShim = (spec: string): unknown => {
    if (Object.prototype.hasOwnProperty.call(moduleMap, spec)) return moduleMap[spec];
    throw new Error(
      `Cannot require "${spec}" in the browser playground. Available modules: ${Object.keys(moduleMap).join(', ')}.`,
    );
  };

  // 3. Build + run inside an async IIFE (top-level await support).
  const moduleObj = { exports: {} as Record<string, unknown> };
  let fn: (...args: unknown[]) => Promise<unknown>;
  try {
    fn = new Function(
      'require',
      'exports',
      'module',
      'console',
      `return (async () => {\n${js}\n})();`,
    ) as typeof fn;
  } catch (e) {
    return { logs, error: `Compile error — ${errMsg(e)}`, elapsedMs: 0 };
  }

  const t0 = performance.now();
  try {
    await fn(requireShim, moduleObj.exports, moduleObj, sandboxConsole);
    return { logs, error: null, elapsedMs: performance.now() - t0 };
  } catch (e) {
    return { logs, error: errMsg(e), elapsedMs: performance.now() - t0 };
  }
}
