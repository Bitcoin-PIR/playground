'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_NAV } from './nav';

function slugToHref(slug: string): string {
  return slug ? `/docs/${slug}` : '/docs';
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-4 text-sm">
      <ul className="space-y-7">
        {DOCS_NAV.map((section) => (
          <li key={section.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.links.map((link) => {
                const href = slugToHref(link.slug);
                const active = pathname === href;
                return (
                  <li key={link.slug || 'overview'}>
                    <Link
                      href={href}
                      className={`block rounded-md px-2 py-1 transition ${
                        active
                          ? 'bg-bitcoin/10 font-medium text-bitcoin'
                          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                      }`}
                    >
                      {link.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
