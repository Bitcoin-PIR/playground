'use client';

export type Backend = 'dpf' | 'harmonypir' | 'onionpir' | 'oram';

export const BACKENDS: { id: Backend; label: string; tagline: string }[] = [
  { id: 'dpf', label: 'DPF-PIR', tagline: 'two-server, low-latency, batch scans · free when idle' },
  { id: 'harmonypir', label: 'HarmonyPIR', tagline: 'two-server, offline-phase, big batches' },
  { id: 'onionpir', label: 'OnionPIR', tagline: 'one-server FHE, single lookups' },
  { id: 'oram', label: 'ORAM TEE', tagline: 'one-server AMD SEV-SNP enclave · free when idle' },
];

export function BackendSelector<B extends Backend = Backend>({
  value,
  onChange,
  backends,
}: {
  value: B;
  onChange: (b: B) => void;
  /** Restrict the choices (the wire explorer shows the PIR backends only). */
  backends?: readonly B[];
}) {
  const shown = BACKENDS.filter((b) => !backends || (backends as readonly Backend[]).includes(b.id));
  return (
    <div className={`grid gap-3 ${shown.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {shown.map((b) => (
        <button
          key={b.id}
          onClick={() => onChange(b.id as B)}
          className={`rounded-lg border p-4 text-left transition ${
            value === b.id
              ? 'border-bitcoin bg-bitcoin/5'
              : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600'
          }`}
        >
          <div className="font-semibold">{b.label}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{b.tagline}</div>
        </button>
      ))}
    </div>
  );
}
