/**
 * Backend-specific "what would I write in my wallet?" code snippets.
 *
 * These mirror the shape of `lib/playground-clients.ts` but with the
 * scaffolding pulled out and the WASM init shown explicitly — the user
 * pastes the snippet straight into their wallet codebase. Every snippet is
 * RUNNABLE in the editable runner (`lib/runner/module-map.ts` binds the
 * imports to the same live SDK the structured path uses).
 *
 * Payments: each snippet wires a credit provider (docs: /docs/sdk/payments).
 * The one shown is an empty wallet: DPF and Direct ORAM run free while the
 * servers have room, and a backend a server charges for (HarmonyPIR and
 * OnionPIR) stops the query with "credits required".
 */

import type { Backend } from '@/components/BackendSelector';

export function buildSnippet(backend: Backend, address: string): string {
  const a = address || 'bc1q…';
  switch (backend) {
    case 'dpf':
      return DPF_SNIPPET.replaceAll('__ADDRESS__', a);
    case 'harmonypir':
      return HARMONY_SNIPPET.replaceAll('__ADDRESS__', a);
    case 'onionpir':
      return ONION_SNIPPET.replaceAll('__ADDRESS__', a);
    case 'oram':
      return ORAM_SNIPPET.replaceAll('__ADDRESS__', a);
  }
}

const EMPTY_WALLET = `// Payments (/docs/sdk/payments): each server says per backend whether it
// charges; a credit provider funds the frames that are paid, and buys
// priority when a free lane is busy. This one is an empty wallet; pass
// CreditWallet.present from 'bitcoin-pir-web' to pay.
const creditProvider = (credits: number) => null;`;

const DPF_SNIPPET = `// DPF-PIR — two servers, low-latency, batch scans. Free while the
// servers have room: pir1 serves DPF on a best-effort free lane (paid
// lookups go first; with the empty wallet below, a busy pir1 answers
// "free capacity busy").

import init, { WasmDpfClient } from 'pir-sdk-wasm';
import { addressToScriptPubKey, scriptHash, hexToBytes }
  from 'bitcoin-pir-web';
import { AMD_TURIN_ARK_FINGERPRINT, PIR1_PIN, PIR2_TIER3_PIN }
  from 'bitcoin-pir-web/attest-pin';

await init();

${EMPTY_WALLET}

const client = new WasmDpfClient(
  'wss://weikeng1.bitcoinpir.org',
  'wss://weikeng2.bitcoinpir.org',
);
try {
  await client.connect();

  // Pinned attestation (proves each server runs the binary the operator
  // built) — required before sending any query.
  const att0 = await client.attest(0);
  const att1 = await client.attest(1);
  if (att0.binarySha256Hex !== PIR1_PIN.binarySha256Hex) {
    throw new Error('pir1 binary pin mismatch');
  }
  if (att1.binarySha256Hex !== PIR2_TIER3_PIN.binarySha256Hex) {
    throw new Error('pir2 binary pin mismatch');
  }
  if (att1.launchMeasurementHex !== PIR2_TIER3_PIN.measurementHex) {
    throw new Error('pir2 SEV-SNP MEASUREMENT pin mismatch');
  }
  att1.verifyVcekChain(AMD_TURIN_ARK_FINGERPRINT);  // AMD chain
  await client.upgradeToSecureChannel(att0.serverStaticPub, att1.serverStaticPub);

  // After the sealed channel (presentations are bearer material).
  // 'best-effort' = free while the server has room.
  console.log('credits pir1:', await client.enableCredits(0, creditProvider));
  console.log('credits pir2:', await client.enableCredits(1, creditProvider));

  const catalog = await client.fetchCatalog();
  catalog.free?.();

  // Address -> scripthash (HASH160 of scriptPubKey). Pack N of them
  // back to back (20*N bytes) to batch.
  const spkHex = addressToScriptPubKey('__ADDRESS__')!;
  const sh = scriptHash(hexToBytes(spkHex));

  // Query + per-bucket Merkle verification in one all-or-nothing call:
  // it returns only when every result verified against the published
  // tree tops (not-found results included, as absence proofs).
  const [result] = await client.queryBatchVerified(sh, 0);
  console.log('balance (sats):', result.totalBalance);
  for (let i = 0; i < result.entryCount; i++) {
    const u = result.getEntry(i);
    console.log(\`  \${u.txid}:\${u.vout} = \${u.amountSats} sat\`);
  }
} finally {
  await client.disconnect();
  client.free();  // release the wasm client + its WebSocket callbacks
}
`;

const HARMONY_SNIPPET = `// HarmonyPIR — two servers + offline hint phase, optimised for bigger
// batches. The first query fetches a ~140 MB hint set from the hint
// server (pir1, which charges credits: with the empty wallet below this
// stops at the hint download).

import init, { WasmHarmonyClient } from 'pir-sdk-wasm';
import { addressToScriptPubKey, scriptHash, hexToBytes }
  from 'bitcoin-pir-web';
import { AMD_TURIN_ARK_FINGERPRINT, PIR1_PIN, PIR2_TIER3_PIN }
  from 'bitcoin-pir-web/attest-pin';

await init();

${EMPTY_WALLET}

const client = new WasmHarmonyClient(
  'wss://weikeng1.bitcoinpir.org',  // hint
  'wss://weikeng2.bitcoinpir.org',  // query
);
try {
  await client.connect();

  // Same attest + pin + channel upgrade as DPF.
  const att0 = await client.attest(0);
  const att1 = await client.attest(1);
  if (att0.binarySha256Hex !== PIR1_PIN.binarySha256Hex) {
    throw new Error('pir1 binary pin mismatch');
  }
  if (att1.launchMeasurementHex !== PIR2_TIER3_PIN.measurementHex) {
    throw new Error('pir2 SEV-SNP MEASUREMENT pin mismatch');
  }
  att1.verifyVcekChain(AMD_TURIN_ARK_FINGERPRINT);
  await client.upgradeToSecureChannel(att0.serverStaticPub, att1.serverStaticPub);

  console.log('credits hint:', await client.enableCredits(0, creditProvider));
  console.log('credits query:', await client.enableCredits(1, creditProvider));

  const catalog = await client.fetchCatalog();
  catalog.free?.();

  const spkHex = addressToScriptPubKey('__ADDRESS__')!;
  const sh = scriptHash(hexToBytes(spkHex));

  // Fetches the hint set on first use, then queries and verifies the
  // per-bucket Merkle proofs — all or nothing. Persist \`saveHints()\` to
  // IndexedDB to keep the (paid) hint set across page reloads.
  const [result] = await client.queryBatchVerified(sh, 0);
  console.log('balance (sats):', result.totalBalance);
  for (let i = 0; i < result.entryCount; i++) {
    const u = result.getEntry(i);
    console.log(\`  \${u.txid}:\${u.vout} = \${u.amountSats} sat\`);
  }
} finally {
  await client.disconnect();
  client.free();  // release the wasm client + its WebSocket callbacks
}
`;

const ONION_SNIPPET = `// OnionPIR — single-server FHE backend. SEAL doesn’t compile to
// wasm32, so the OnionPIR client is hand-rolled TypeScript. Heavier
// per query than DPF; nice when you only need one address. It runs on
// pir1, which charges credits: with the empty wallet below this stops
// at the first metered frame.

import { OnionPirWebClient } from 'bitcoin-pir-web/onionpir_client';
import { addressToScriptPubKey, scriptHash, hexToBytes, PIR1_PROVIDER }
  from 'bitcoin-pir-web';

${EMPTY_WALLET}

const client = new OnionPirWebClient({
  serverUrl: PIR1_PROVIDER.endpoint,
  // Attestation pin + operator-signed identity of pir1.
  expectedServerPin: PIR1_PROVIDER.serverPin,
  expectedServerId: PIR1_PROVIDER.stableServerId,
  pinnedOperatorPubkey: PIR1_PROVIDER.operatorPubkey,
  creditProvider,
  onCredits: (status) => console.log('credits:', status.state),
});
try {
  await client.connect();

  const spkHex = addressToScriptPubKey('__ADDRESS__')!;
  const sh = scriptHash(hexToBytes(spkHex));

  const results = await client.queryBatch([sh]);

  // SOUNDNESS: OnionPIR's queryBatch does NOT verify the per-bin
  // Merkle proof on its own — call verifyMerkleBatch explicitly and
  // refuse the result unless every verdict passes.
  const nonNull = results.filter((r): r is NonNullable<typeof r> => !!r);
  const verdicts = await client.verifyMerkleBatch(nonNull);
  if (verdicts.length === 0 || !verdicts.every(Boolean)) {
    throw new Error('Merkle proof FAILED or missing — untrusted result');
  }

  // A not-found lookup still returns a result (its absence proof).
  const [result] = results;
  if (!result || result.entries.length === 0) {
    console.log('no UTXOs (verified absent)');
  } else {
    console.log('balance (sats):', result.totalSats);
    for (const u of result.entries) {
      const txidHex = Array.from(u.txid).reverse()
        .map((b) => b.toString(16).padStart(2, '0')).join('');
      console.log(\`  \${txidHex}:\${u.vout} = \${u.amount} sat\`);
    }
  }
} finally {
  client.disconnect();
}
`;

const ORAM_SNIPPET = `// Direct ORAM — one server inside an AMD SEV-SNP guest (pir2). The
// server process sees the script hash, the host does not; every lookup
// is one fixed-budget ORAM request (25 padded slots). Free while pir2
// has room.

import {
  OramPirClientAdapter,
  PIR2_PROVIDER,
  PRODUCTION_ORAM_BATCH_PLANNER,
  addressToScriptPubKey, scriptHash, hexToBytes,
} from 'bitcoin-pir-web';
import { AMD_TURIN_ARK_FINGERPRINT, PRODUCTION_ORAM_DB_PROOF_V2_PINS }
  from 'bitcoin-pir-web/attest-pin';

${EMPTY_WALLET}

const client = new OramPirClientAdapter({
  serverUrl: PIR2_PROVIDER.endpoint,
  // Fail closed: AMD chain + pinned binary/MEASUREMENT, the operator-
  // signed identity of pir2, and a database proof checked here must all
  // pass before any lookup.
  strictVerification: true,
  expectedArkFingerprint: AMD_TURIN_ARK_FINGERPRINT,
  expectedServerPin: PIR2_PROVIDER.serverPin,
  expectedServerId: PIR2_PROVIDER.stableServerId,
  pinnedOperatorPubkey: PIR2_PROVIDER.operatorPubkey,
  verifyOperatorIdentity: true,
  databaseProofPins: PRODUCTION_ORAM_DB_PROOF_V2_PINS,
  // The production request shape — never choose your own.
  batchPlanner: PRODUCTION_ORAM_BATCH_PLANNER,
  creditProvider,
  onCredits: (status) => console.log('credits:', status.state),
});
try {
  await client.connect();
  console.log('attestation:', client.attestation.state);
  console.log('operator identity:', client.operatorIdentity.state);
  console.log('database proof:', client.getDatabaseProofStatus(0)?.state);

  const spkHex = addressToScriptPubKey('__ADDRESS__')!;
  const sh = scriptHash(hexToBytes(spkHex));

  const [result] = await client.queryBatch([sh], undefined, 0);
  if (!result) {
    console.log('no UTXOs');
  } else {
    console.log('balance (sats):', result.totalSats);
    for (const u of result.entries) {
      const txidHex = Array.from(u.txid).reverse()
        .map((b) => b.toString(16).padStart(2, '0')).join('');
      console.log(\`  \${txidHex}:\${u.vout} = \${u.amount} sat\`);
    }
  }
} finally {
  client.disconnect();
}
`;
