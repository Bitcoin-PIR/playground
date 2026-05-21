/**
 * Single source of truth for the docs site navigation.
 *
 * `slug` is the path under `/docs` (empty string = landing).
 * The dynamic MDX route under `app/docs/[...slug]/page.tsx` reads
 * the same slug to locate the MDX file at
 * `content/docs/<slug>.mdx` (or `content/docs/index.mdx` for the
 * landing page).
 */

export type DocLink = {
  slug: string;
  title: string;
  /** Optional one-line summary surfaced in section landings. */
  summary?: string;
};

export type DocSection = {
  title: string;
  links: DocLink[];
};

export const DOCS_NAV: DocSection[] = [
  {
    title: 'Get started',
    links: [
      { slug: '', title: 'Overview', summary: 'What Bitcoin PIR is, what the three surfaces do, where to go next.' },
      { slug: 'quickstart', title: 'Quickstart', summary: 'Add PIR to a wallet in ten minutes — DPF backend, copy-paste TypeScript.' },
    ],
  },
  {
    title: 'Concepts',
    links: [
      { slug: 'concepts/why-pir', title: 'Why PIR', summary: 'The threat model. What a normal Electrum-style wallet leaks. What PIR fixes.' },
      { slug: 'concepts/backends', title: 'Backend comparison', summary: 'DPF vs HarmonyPIR vs OnionPIR — a decision matrix.' },
    ],
  },
  {
    title: 'SDK reference',
    links: [
      { slug: 'sdk/typescript', title: 'TypeScript / WASM', summary: 'The browser SDK — DPF and HarmonyPIR via WASM, OnionPIR via hand-rolled TS.' },
      { slug: 'sdk/rust', title: 'Rust', summary: 'Native crates: pir-sdk-client, pir-sdk, pir-core. Same protocol, no WASM.' },
    ],
  },
  {
    title: 'Protocol',
    links: [
      { slug: 'protocol/wire-format', title: 'Wire format', summary: 'WebSocket frames, codec, request/response variant codes.' },
      { slug: 'protocol/dpf', title: 'DPF backend', summary: 'Two-server DPF — fastest, stateless, batch-friendly.' },
      { slug: 'protocol/harmonypir', title: 'HarmonyPIR backend', summary: 'Two-server with offline hint phase. Best amortized cost.' },
      { slug: 'protocol/onionpir', title: 'OnionPIR backend', summary: 'Single-server FHE. No second server, but slower.' },
    ],
  },
  {
    title: 'Privacy',
    links: [
      { slug: 'privacy/invariants', title: 'The four invariants', summary: 'What the wire reveals, what it does not. K=75, K_CHUNK=80, two cuckoo probes, group-symmetric placement.' },
      { slug: 'privacy/attestation', title: 'Attestation', summary: 'Verifying the SEV-SNP report and the operator-pinned MEASUREMENT.' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { slug: 'operations/endpoints', title: 'Live endpoints', summary: 'weikeng1 (hint) vs weikeng2 (query); WebSocket-only contract.' },
    ],
  },
  {
    title: 'Help',
    links: [
      { slug: 'troubleshooting', title: 'Troubleshooting', summary: 'Common errors and the fix.' },
    ],
  },
];

/** Flat list — handy for prev/next navigation and lookups. */
export const DOCS_FLAT: DocLink[] = DOCS_NAV.flatMap((s) => s.links);

export function findDoc(slug: string): { current: DocLink; section: DocSection; index: number } | null {
  for (const section of DOCS_NAV) {
    const i = section.links.findIndex((l) => l.slug === slug);
    if (i >= 0) return { current: section.links[i], section, index: DOCS_FLAT.findIndex((l) => l.slug === slug) };
  }
  return null;
}

export function prevNext(slug: string): { prev: DocLink | null; next: DocLink | null } {
  const i = DOCS_FLAT.findIndex((l) => l.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? DOCS_FLAT[i - 1] : null,
    next: i < DOCS_FLAT.length - 1 ? DOCS_FLAT[i + 1] : null,
  };
}
