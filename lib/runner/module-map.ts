'use client';

/**
 * Module map for the in-browser code runner.
 *
 * The editable-runner (`components/playground/EditableRunner.tsx`) executes
 * user-authored TypeScript by transpiling it to CommonJS and feeding a
 * `require()` shim. The keys here are the EXACT specifiers the generated
 * snippets import from (see `lib/snippet.ts`), so an unedited snippet runs
 * verbatim:
 *
 *   import init, { WasmDpfClient } from 'pir-sdk-wasm';
 *   import { addressToScriptPubKey, scriptHash, hexToBytes } from 'bitcoin-pir-web';
 *   import { ... } from 'bitcoin-pir-web/attest-pin';
 *   import { OnionPirWebClient } from 'bitcoin-pir-web/onionpir_client';
 *
 * Every value is the SAME live binding the structured "Run query" path uses
 * (`lib/playground-clients.ts`). There is no second, weaker code path: the
 * privacy/soundness properties hold or fail identically whichever button you
 * press. The runner cannot bypass the invariants baked into the vendored
 * clients — it can only omit the calls that invoke them (which the safety
 * lint flags).
 */

import { loadWasm } from '@/lib/wasm-loader';
import { ensureOnionWasmFactory } from '@/lib/playground-clients';
import * as hash from '@vendor/web/hash';
import * as attestPin from '@vendor/web/attest-pin';
import { OnionPirWebClient } from '@vendor/web/onionpir_client';

export type RunnerModule = Record<string, unknown>;
export type ModuleMap = Record<string, RunnerModule>;

/**
 * Build the specifier → module map exposed to user code.
 *
 * `source` is inspected only to decide whether to install the OnionPIR wasm
 * factory (so a DPF/HarmonyPIR run doesn't pull in the FHE runtime it never
 * touches).
 */
export async function buildModuleMap(source: string): Promise<ModuleMap> {
  const wasm = await loadWasm();

  if (/OnionPirWebClient/.test(source)) {
    // Mirrors the structured OnionPIR path: install the wasm factory on the
    // documented global hook before the client is constructed.
    await ensureOnionWasmFactory();
  }

  // `loadWasm()` already ran wasm-bindgen's `init()` once (and cached it).
  // Make the snippet's `await init()` a harmless no-op instead of letting it
  // re-instantiate the module. `__esModule` lets Sucrase's interop read
  // `.default` / named exports directly without re-wrapping.
  const pirSdkWasm: RunnerModule = {
    ...(wasm as unknown as RunnerModule),
    __esModule: true,
    default: async () => wasm,
  };

  return {
    'pir-sdk-wasm': pirSdkWasm,
    'bitcoin-pir-web': {
      __esModule: true,
      addressToScriptPubKey: hash.addressToScriptPubKey,
      scriptHash: hash.scriptHash,
      hexToBytes: hash.hexToBytes,
      bytesToHex: hash.bytesToHex,
    },
    'bitcoin-pir-web/attest-pin': {
      __esModule: true,
      ...(attestPin as unknown as RunnerModule),
    },
    'bitcoin-pir-web/onionpir_client': {
      __esModule: true,
      OnionPirWebClient,
    },
  };
}
