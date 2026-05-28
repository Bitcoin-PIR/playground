'use client';

import type { OperatorIdentitySummary } from '@/lib/playground-clients';

/**
 * Operator-signed-identity (REQ_ANNOUNCE) badge. Mirrors AttestationBadge.
 *
 * Renders a green "operator-endorsed" badge when the server's announce
 * bundle verified against the pinned operator key AND the attested channel
 * key, and a red warning when a bundle came back but a check failed. Returns
 * `null` for the benign / transient states ('unconfigured', 'error',
 * 'not-checked') — ResultPanel only renders the section when at least one
 * server reached a definitive verdict, so no empty panel shows.
 */
export function OperatorIdentityBadge({ op }: { op: OperatorIdentitySummary }) {
  const { identity, label } = op;
  if (identity.state !== 'verified' && identity.state !== 'unverified') {
    return null;
  }
  const verified = identity.state === 'verified';
  const tone = verified
    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
    : 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200';
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border px-3 py-2 ${tone}`}
      title={
        verified
          ? `Operator-endorsed identity for ${identity.serverId ?? label}`
          : identity.error ?? 'operator identity check failed'
      }
    >
      <div className="flex items-center gap-2">
        <span className="inline-block size-2 rounded-full bg-current opacity-80" />
        <span className="font-medium">{label}</span>
        <span className="ml-auto text-xs uppercase tracking-wide">
          {verified ? '🔏 operator-endorsed' : '⚠ unverified'}
        </span>
      </div>
      {verified ? (
        <>
          <div className="text-xs opacity-80 break-words">
            Endorsed by the pinned operator key, bound to the attested channel
            key.
          </div>
          {identity.operatorPubkeyHex && (
            <div className="font-mono text-[10px] opacity-60">
              operator={identity.operatorPubkeyHex.slice(0, 16)}…
              {identity.gitRev ? ` · git=${identity.gitRev.slice(0, 12)}` : ''}
            </div>
          )}
        </>
      ) : (
        <div className="text-xs opacity-80 break-words">
          {identity.error ??
            'A bundle came back but a check failed — treat as a strong negative signal.'}
        </div>
      )}
    </div>
  );
}
