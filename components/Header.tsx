import Link from 'next/link';

const NAV = [
  { href: '/playground', label: 'Playground' },
  { href: '/explorer', label: 'Wire explorer' },
  { href: '/rate-limiting', label: 'Rate limiting' },
  { href: '/docs', label: 'Docs' },
];

export function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="container-wide flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block size-2 rounded-full bg-bitcoin" />
          Bitcoin PIR
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://github.com/Bitcoin-PIR/playground"
            className="text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
