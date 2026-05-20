import type { Metadata } from 'next';
import { PrevNext } from '@/components/docs/PrevNext';
import Content from '@/content/docs/index.mdx';

export const metadata: Metadata = {
  title: 'API reference',
  description:
    'Integration guides, SDK reference, protocol spec, privacy guarantees, attestation.',
};

export default function DocsHome() {
  return (
    <article className="prose-zinc max-w-3xl py-8">
      <Content />
      <PrevNext slug="" />
    </article>
  );
}
