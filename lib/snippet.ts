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
 * The one shown is an empty wallet: DPF and HarmonyPIR run free while the
 * servers have room, and a backend a server charges for (OnionPIR) stops
 * the query with "credits required". Direct ORAM is free while its TEE
 * host has room; its snippet stops at the ORAM_PROVIDER guard only if
 * Direct ORAM is paused.
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
// CashuWallet.present from 'bitcoin-pir-web' to pay.
const creditProvider = (credits: number) => null;`;

// Neither live server has a TEE (both attest as 'noSevHost'), so nothing
// hardware-signs their channel keys. Indented for the `try` block it is
// pasted into.
const CHECK_OPERATOR_IDENTITY = `// No TEE on either server: the operator-signed identity (REQ_ANNOUNCE)
  // is what ties each channel key to the operator.
  const now = BigInt(Math.floor(Date.now() / 1000));
  for (const [i, p, att] of [[0, PIR1_PROVIDER, att0], [1, PIR2_PROVIDER, att1]] as const) {
    const v = await client.announce(i);
    const id = gateOperatorIdentity(v, p.operatorPubkey, att.serverStaticPub, now);
    v.free();
    console.log(\`server \${i} operator identity: \${id.state}\`,
      'signed binary matches the pin:', pinAcceptsBinary(p.serverPin, id.binarySha256Hex ?? ''));
  }`;

const DPF_SNIPPET = `// DPF-PIR — two servers, low-latency, batch scans. Free while the
// servers have room: both serve DPF on a best-effort free lane (paid
// lookups go first; with the empty wallet below, a busy server answers
// "free capacity busy").

import init, { WasmDpfClient } from 'pir-sdk-wasm';
import {
  addressToScriptPubKey, scriptHash, hexToBytes,
  gateOperatorIdentity, PIR1_PROVIDER, PIR2_PROVIDER,
} from 'bitcoin-pir-web';
import { pinAcceptsBinary } from 'bitcoin-pir-web/attest-pin';

await init();

${EMPTY_WALLET}

const client = new WasmDpfClient(
  PIR1_PROVIDER.endpoint,  // wss://weikeng1.bitcoinpir.org
  PIR2_PROVIDER.endpoint,  // wss://bitcoin-pir-weikeng-laptop.chenweikeng.com
);
try {
  await client.connect();

  // Each server reports the binary it runs; compare it with the pin. With
  // no TEE the pin catches drift from the operator-published build but is
  // not hardware-backed. pinAcceptsBinary: the pinned build, or the pin's
  // transition build while the operator switches a node to a new build.
  const att0 = await client.attest(0);
  const att1 = await client.attest(1);
  console.log('pir1 binary matches the pin:', pinAcceptsBinary(PIR1_PROVIDER.serverPin, att0.binarySha256Hex));
  console.log('pir2 binary matches the pin:', pinAcceptsBinary(PIR2_PROVIDER.serverPin, att1.binarySha256Hex));
  await client.upgradeToSecureChannel(att0.serverStaticPub, att1.serverStaticPub);

  ${CHECK_OPERATOR_IDENTITY}

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

  // Query + per-bucket Merkle verification: each result carries its own
  // verdict (not-found results included, as absence proofs).
  const [result] = await client.queryBatchVerified(sh, 0);
  console.log('Merkle verified:', result.merkleVerified);
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
// server (pir1). Free while the servers have room: both serve HarmonyPIR
// on a best-effort free lane, and pir1 also caps free hint work per hour
// (with the empty wallet below, a busy server answers "free capacity busy").

import init, { WasmHarmonyClient } from 'pir-sdk-wasm';
import {
  addressToScriptPubKey, scriptHash, hexToBytes,
  gateOperatorIdentity, PIR1_PROVIDER, PIR2_PROVIDER,
} from 'bitcoin-pir-web';
import { pinAcceptsBinary } from 'bitcoin-pir-web/attest-pin';

await init();

${EMPTY_WALLET}

const client = new WasmHarmonyClient(
  PIR1_PROVIDER.endpoint,  // hint: wss://weikeng1.bitcoinpir.org
  PIR2_PROVIDER.endpoint,  // query: wss://bitcoin-pir-weikeng-laptop.chenweikeng.com
);
try {
  await client.connect();

  // Same attest + pin + channel upgrade + identity check as DPF.
  const att0 = await client.attest(0);
  const att1 = await client.attest(1);
  console.log('pir1 binary matches the pin:', pinAcceptsBinary(PIR1_PROVIDER.serverPin, att0.binarySha256Hex));
  console.log('pir2 binary matches the pin:', pinAcceptsBinary(PIR2_PROVIDER.serverPin, att1.binarySha256Hex));
  await client.upgradeToSecureChannel(att0.serverStaticPub, att1.serverStaticPub);

  ${CHECK_OPERATOR_IDENTITY}

  console.log('credits hint:', await client.enableCredits(0, creditProvider));
  console.log('credits query:', await client.enableCredits(1, creditProvider));

  const catalog = await client.fetchCatalog();
  catalog.free?.();

  const spkHex = addressToScriptPubKey('__ADDRESS__')!;
  const sh = scriptHash(hexToBytes(spkHex));

  // Fetches the hint set on first use, then queries and verifies the
  // per-bucket Merkle proofs; each result carries its own verdict. Persist
  // \`saveHints()\` to IndexedDB to keep the hint set across page reloads.
  const [result] = await client.queryBatchVerified(sh, 0);
  console.log('Merkle verified:', result.merkleVerified);
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
  pinnedOperatorPubkey: PIR1_PROVIDER.operatorPubkey,
  onAttestation: (status) => console.log('attestation:', status.state),
  onOperatorIdentity: (status) => console.log('operator identity:', status.state),
  creditProvider,
  onCredits: (status) => console.log('credits:', status.state),
});
try {
  await client.connect();

  const spkHex = addressToScriptPubKey('__ADDRESS__')!;
  const sh = scriptHash(hexToBytes(spkHex));

  // queryBatch verifies the per-bin Merkle proofs before it returns; each
  // result carries its own verdict. A not-found lookup still returns a
  // result (its absence proof).
  const [result] = await client.queryBatch([sh]);
  console.log('Merkle verified:', result?.merkleVerified === true);
  if (!result || result.entries.length === 0) {
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

const ORAM_SNIPPET = `// Direct ORAM — one server inside an AMD SEV-SNP guest. The server
// process sees the script hash, the host does not; every lookup is one
// fixed-budget ORAM request (25 padded slots). The host is a VPSBG
// AMD Milan SEV-SNP guest; ORAM_PROVIDER is null only while Direct ORAM
// is paused.

import {
  OramPirClientAdapter,
  ORAM_PROVIDER, ORAM_PAUSED_MESSAGE,
  PRODUCTION_ORAM_BATCH_PLANNER,
  addressToScriptPubKey, scriptHash, hexToBytes,
} from 'bitcoin-pir-web';
import { PRODUCTION_ORAM_DB_PROOF_V2_PINS }
  from 'bitcoin-pir-web/attest-pin';

${EMPTY_WALLET}

if (!ORAM_PROVIDER) throw new Error(ORAM_PAUSED_MESSAGE);

const client = new OramPirClientAdapter({
  serverUrl: ORAM_PROVIDER.endpoint,
  // Checked on connect and reported below: AMD chain + pinned
  // binary/MEASUREMENT, the operator-signed identity of the ORAM host,
  // and the database proof.
  expectedArkFingerprint: ORAM_PROVIDER.expectedArkFingerprint,
  expectedServerPin: ORAM_PROVIDER.serverPin,
  pinnedOperatorPubkey: ORAM_PROVIDER.operatorPubkey,
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
