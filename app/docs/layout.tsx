import { Sidebar } from '@/components/docs/Sidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-wide grid grid-cols-1 gap-8 py-4 md:grid-cols-[16rem_1fr]">
      <aside className="hidden md:block border-r border-zinc-200 dark:border-zinc-800">
        <Sidebar />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
