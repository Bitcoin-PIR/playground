import Link from 'next/link';

export default function Home() {
  return (
    <div className="container-narrow py-16">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Bitcoin PIR for wallet developers
      </h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        Look up Bitcoin UTXOs without telling the server which addresses you care about.
        Three backends, one SDK, fully reproducible builds.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        <Card
          href="/playground"
          title="Playground"
          body="Paste an address, run a real query, see the exact SDK code for your wallet."
        />
        <Card
          href="/explorer"
          title="Wire explorer"
          body="Inspect every WebSocket frame and verify the four privacy invariants hold on your traffic."
        />
        <Card
          href="/docs"
          title="API reference"
          body="Integration guides, SDK reference, protocol spec, privacy guarantees, attestation."
        />
      </div>

      <div className="mt-16 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Live servers</h2>
        <ul className="mt-3 space-y-1 font-mono text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <span className="text-zinc-500">hint:</span>{' '}
            <code>wss://weikeng1.bitcoinpir.org</code>{' '}
            <span className="text-zinc-500">(Hetzner, no SEV)</span>
          </li>
          <li>
            <span className="text-zinc-500">query:</span>{' '}
            <code>wss://weikeng2.bitcoinpir.org</code>{' '}
            <span className="text-zinc-500">(VPSBG, SEV-SNP Tier 3)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Card({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-zinc-200 p-6 transition hover:border-bitcoin dark:border-zinc-800"
    >
      <h3 className="text-xl font-semibold group-hover:text-bitcoin">{title} →</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </Link>
  );
}
