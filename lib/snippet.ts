/**
 * Backend-specific "what would I write in my wallet?" code snippets.
 *
 * These mirror the shape of `lib/playground-clients.ts` but with the
 * scaffolding pulled out and the WASM init shown explicitly — the user
 * pastes the snippet straight into their wallet codebase.
 */

import type { Backend } from '@/components/BackendSelector';

export function buildSnippet(backend: Backend, address: string): string {
  switch (backend) {
    case 'dpf':
      return DPF_SNIPPET.replaceAll('__ADDRESS__', address || 'bc1q…');
    case 'harmonypir':
      return HARMONY_SNIPPET.replaceAll('__ADDRESS__', address || 'bc1q…');
    case 'onionpir':
      return ONION_SNIPPET.replaceAll('__ADDRESS__', address || 'bc1q…');
  }
}

const DPF_SNIPPET = `// DPF-PIR — two servers, low-latency, batch scans.
// npm install pir-sdk-wasm

import init, { WasmDpfClient } from 'pir-sdk-wasm';
import { addressToScriptPubKey, scriptHash, hexToBytes }
  from 'bitcoin-pir-web';
import { AMD_TURIN_ARK_FINGERPRINT, PIR1_PIN, PIR2_TIER3_PIN }
  from 'bitcoin-pir-web/attest-pin';

await init();

const client = new WasmDpfClient(
  'wss://weikeng1.bitcoinpir.org',
  'wss://weikeng2.bitcoinpir.org',
);
await client.connect();

// Pinned-attestation (proves the server is running the binary the
// operator built — required before sending any query).
const att0 = await client.attest(0);
const att1 = await client.attest(1);
if (att1.binarySha256Hex !== PIR2_TIER3_PIN.binarySha256Hex) {
  throw new Error('pir2 binary pin mismatch');
}
if (att1.launchMeasurementHex !== PIR2_TIER3_PIN.measurementHex) {
  throw new Error('pir2 SEV-SNP MEASUREMENT pin mismatch');
}
att1.verifyVcekChain(AMD_TURIN_ARK_FINGERPRINT);  // AMD chain
await client.upgradeToSecureChannel(att0.serverStaticPub, att1.serverStaticPub);

// Warm the database catalog — queryBatchRaw resolves db_id against the
// native-side catalog state, so fetch it once after connecting.
const catalog = await client.fetchCatalog();
catalog.free?.();

// Address -> scripthash (HASH160 of scriptPubKey).
const spkHex = addressToScriptPubKey('__ADDRESS__')!;
const sh = scriptHash(hexToBytes(spkHex));  // 20 bytes

// Query. Batch up to 8-16 addresses at once for amortised cost.
// queryBatchRaw is the inspector path: it returns the bin payloads
// needed to verify the per-bucket Merkle proof but does NOT run the
// verifier itself — that's a separate call below. Always pair them.
const packed = sh;  // for a single query
const wqrs = await client.queryBatchRaw(packed, 0);

// SOUNDNESS: verify the per-bucket Merkle proof before trusting any
// result. A failing verdict means the data is inconsistent with the
// pinned tree-top commitment — refuse to use it.
const jsonArr = wqrs.map((w) => w.toJson());
const verdicts = await client.verifyMerkleBatch(jsonArr, 0);
if (verdicts.length === 0 || !verdicts.every(Boolean)) {
  throw new Error('Merkle proof FAILED — untrusted result');
}

const [result] = wqrs;
console.log('balance (sats):', result.totalBalance);
for (let i = 0; i < result.entryCount; i++) {
  const u = result.getEntry(i);
  console.log(\`  \${u.txid}:\${u.vout} = \${u.amountSats} sat\`);
}

await client.disconnect();
client.free();  // release the wasm client + its WebSocket callbacks
`;

const HARMONY_SNIPPET = `// HarmonyPIR — two servers + offline hint phase, optimised for bigger
// batches.  Fetches a ~50 MB hint pool from the hint server once per
// (db_id, master_key); subsequent queries amortise that cost.

import init, { WasmHarmonyClient } from 'pir-sdk-wasm';
import { addressToScriptPubKey, scriptHash, hexToBytes }
  from 'bitcoin-pir-web';
import { AMD_TURIN_ARK_FINGERPRINT, PIR1_PIN, PIR2_TIER3_PIN }
  from 'bitcoin-pir-web/attest-pin';

await init();

const client = new WasmHarmonyClient(
  'wss://weikeng1.bitcoinpir.org',  // hint
  'wss://weikeng2.bitcoinpir.org',  // query
);
await client.connect();

// Same attest + pin + channel-upgrade as DPF (see DPF snippet).
const att0 = await client.attest(0);
const att1 = await client.attest(1);
await client.upgradeToSecureChannel(att0.serverStaticPub, att1.serverStaticPub);

// Hint warm-up. Persist \`saveHints()\` to IndexedDB if you want to keep
// the pool across page reloads — see web/src/harmonypir_hint_db.ts.
await client.fetchHintsWithProgress(
  await client.fetchCatalog(),
  0,  // db_id
  (p: { done: number; total: number; phase: string }) =>
    console.log(\`hints: \${p.phase} \${p.done}/\${p.total}\`),
);

const spkHex = addressToScriptPubKey('__ADDRESS__')!;
const sh = scriptHash(hexToBytes(spkHex));
// queryBatchRaw is the inspector path: it returns the bin payloads
// needed to verify the per-bucket Merkle proof but does NOT run the
// verifier itself — that's a separate call below. Always pair them.
const wqrs = await client.queryBatchRaw(sh, 0);

// SOUNDNESS: verify the per-bucket Merkle proof before trusting any
// result. A failing verdict means the data is inconsistent with the
// pinned tree-top commitment — refuse to use it.
const jsonArr = wqrs.map((w) => w.toJson());
const verdicts = await client.verifyMerkleBatch(jsonArr, 0);
if (verdicts.length === 0 || !verdicts.every(Boolean)) {
  throw new Error('Merkle proof FAILED — untrusted result');
}

const [result] = wqrs;
console.log('balance (sats):', result.totalBalance);
for (let i = 0; i < result.entryCount; i++) {
  const u = result.getEntry(i);
  console.log(\`  \${u.txid}:\${u.vout} = \${u.amountSats} sat\`);
}

await client.disconnect();
client.free();  // release the wasm client + its WebSocket callbacks
`;

const ONION_SNIPPET = `// OnionPIR — single-server FHE backend.  SEAL doesn’t compile to
// wasm32, so the OnionPIR client is hand-rolled TypeScript.  Heavier
// per-query than DPF; nice when you only need one address.

import { OnionPirWebClient } from 'bitcoin-pir-web/onionpir_client';
import { addressToScriptPubKey, scriptHash, hexToBytes }
  from 'bitcoin-pir-web';

const client = new OnionPirWebClient({
  serverUrl: 'wss://weikeng1.bitcoinpir.org',
});
await client.connect();

const spkHex = addressToScriptPubKey('__ADDRESS__')!;
const sh = scriptHash(hexToBytes(spkHex));

const results = await client.queryBatch([sh]);

// SOUNDNESS: OnionPIR's queryBatch does NOT verify the per-bin
// Merkle proof on its own — you must call verifyMerkleBatch
// explicitly. A failing verdict means the data is inconsistent with
// the pinned super-root; refuse to use it.
const nonNull = results.filter((r): r is NonNullable<typeof r> => !!r);
if (nonNull.length > 0) {
  const verdicts = await client.verifyMerkleBatch(nonNull);
  if (!verdicts.every(Boolean)) {
    throw new Error('Merkle proof FAILED — untrusted result');
  }
}

const [result] = results;
if (!result) {
  console.log('no UTXOs');
} else {
  console.log('balance (sats):', result.totalSats);
  for (const u of result.entries) {
    const txidLE = Array.from(u.txid).reverse();
    const txidHex = txidLE
      .map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(\`  \${txidHex}:\${u.vout} = \${u.amount} sat\`);
  }
}

client.disconnect();
`;
