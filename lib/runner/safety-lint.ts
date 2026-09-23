'use client';

/**
 * Heuristic, NON-BLOCKING audit of the edited runner code.
 *
 * This is a plain string scan, not a data-flow analysis — it can only flag
 * when a privacy/soundness-critical call is *missing entirely*; it cannot
 * prove the present calls are wired correctly. It NEVER blocks running: the
 * user owns their own browser and their own query's privacy. Per CLAUDE.md
 * ("Don't add UI controls that could violate the privacy invariants") the
 * editable runner surfaces the risk rather than silently enabling it.
 */

import type { Backend } from '@/components/BackendSelector';

export interface SafetyWarning {
  id: string;
  title: string;
  message: string;
}

export function lintSafety(code: string, backend: Backend): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  const has = (re: RegExp) => re.test(code);

  // Soundness. DPF / HarmonyPIR / OnionPIR: per-bucket Merkle proofs, via
  // queryBatchVerified (wasm clients, all-or-nothing) or verifyMerkleBatch.
  // Direct ORAM has no Merkle proofs: strict mode is the gate.
  if (backend === 'oram') {
    if (!has(/strictVerification\s*:\s*true/)) {
      warnings.push({
        id: 'strict',
        title: 'Strict verification off',
        message:
          'No `strictVerification: true` found. Direct ORAM has no Merkle proofs; strict mode is what refuses to query until the attestation, the operator-signed identity and the database proof all pass.',
      });
    }
    if (!has(/PRODUCTION_ORAM_BATCH_PLANNER/)) {
      warnings.push({
        id: 'planner',
        title: 'Not the production request shape',
        message:
          'No PRODUCTION_ORAM_BATCH_PLANNER found. Any other batchPlanner (or none) can make request sizes depend on the batch, which the server observes.',
      });
    }
  } else if (!has(/queryBatchVerified\s*\(|verifyMerkleBatch\s*\(/)) {
    warnings.push({
      id: 'merkle',
      title: 'No Merkle verification',
      message:
        'No queryBatchVerified(...) or verifyMerkleBatch(...) call found. The result is never checked against the published per-bucket Merkle commitment, so a malicious or buggy server could return forged UTXOs undetected.',
    });
  }

  // Attestation + sealed channel — the wasm clients (DPF / HarmonyPIR). The
  // OnionPIR and ORAM clients attest and seal inside connect(), so flagging
  // them there would be a false alarm.
  if (backend === 'dpf' || backend === 'harmonypir') {
    if (!has(/\.attest\s*\(/)) {
      warnings.push({
        id: 'attest',
        title: 'No server attestation',
        message:
          'No attest(...) call found. Without attestation you never verify the server is running the operator-pinned binary before sending a query.',
      });
    }
    if (!has(/upgradeToSecureChannel\s*\(/)) {
      warnings.push({
        id: 'channel',
        title: 'No sealed channel',
        message:
          'No upgradeToSecureChannel(...) call found. The query may run over an unauthenticated channel instead of the AEAD-sealed one, and credits can only be presented inside it.',
      });
    }
  }

  return warnings;
}
