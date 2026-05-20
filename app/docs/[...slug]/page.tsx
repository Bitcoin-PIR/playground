import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrevNext } from '@/components/docs/PrevNext';
import { findDoc, DOCS_FLAT } from '@/components/docs/nav';

type Params = { slug: string[] };

export function generateStaticParams(): Params[] {
  return DOCS_FLAT.filter((d) => d.slug).map((d) => ({ slug: d.slug.split('/') }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const slug = params.slug.join('/');
  const found = findDoc(slug);
  if (!found) return {};
  return {
    title: found.current.title,
    description: found.current.summary,
  };
}

export default async function DocPage({ params }: { params: Params }) {
  const slug = params.slug.join('/');
  const found = findDoc(slug);
  if (!found) notFound();

  // Dynamic import the MDX. Each known slug maps 1:1 to a file under
  // content/docs/<slug>.mdx. Unknown slugs fall through to notFound()
  // via the findDoc() guard above.
  const mod = await loadMdx(slug);
  const Content = mod.default;

  return (
    <article className="prose-zinc max-w-3xl py-8">
      <Content />
      <PrevNext slug={slug} />
    </article>
  );
}

async function loadMdx(slug: string) {
  switch (slug) {
    case 'quickstart':
      return import('@/content/docs/quickstart.mdx');
    case 'concepts/why-pir':
      return import('@/content/docs/concepts/why-pir.mdx');
    case 'concepts/backends':
      return import('@/content/docs/concepts/backends.mdx');
    case 'sdk/typescript':
      return import('@/content/docs/sdk/typescript.mdx');
    case 'sdk/rust':
      return import('@/content/docs/sdk/rust.mdx');
    case 'protocol/wire-format':
      return import('@/content/docs/protocol/wire-format.mdx');
    case 'protocol/dpf':
      return import('@/content/docs/protocol/dpf.mdx');
    case 'protocol/harmonypir':
      return import('@/content/docs/protocol/harmonypir.mdx');
    case 'protocol/onionpir':
      return import('@/content/docs/protocol/onionpir.mdx');
    case 'privacy/invariants':
      return import('@/content/docs/privacy/invariants.mdx');
    case 'privacy/attestation':
      return import('@/content/docs/privacy/attestation.mdx');
    case 'operations/endpoints':
      return import('@/content/docs/operations/endpoints.mdx');
    case 'troubleshooting':
      return import('@/content/docs/troubleshooting.mdx');
    default:
      notFound();
  }
}
