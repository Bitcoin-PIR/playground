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

  // Merkle verification — soundness, applies to every backend.
  if (!has(/verifyMerkleBatch\s*\(/)) {
    warnings.push({
      id: 'merkle',
      title: 'No Merkle verification',
      message:
        'No verifyMerkleBatch(...) call found. The result is never checked against the pinned per-bucket Merkle commitment, so a malicious or buggy server could return forged UTXOs undetected.',
    });
  }

  // Attestation + sealed channel — DPF / HarmonyPIR only. The OnionPIR TS
  // client hand-rolls its own and exposes neither attest() nor
  // upgradeToSecureChannel(), so flagging them there would be a false alarm.
  if (backend !== 'onionpir') {
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
          'No upgradeToSecureChannel(...) call found. The query may run over an unauthenticated channel instead of the AEAD-sealed one.',
      });
    }
  }

  return warnings;
}
