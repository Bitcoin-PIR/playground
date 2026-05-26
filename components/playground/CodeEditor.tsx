'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, {
  loader,
  type BeforeMount,
  type OnMount,
} from '@monaco-editor/react';
import { SDK_AMBIENT_DTS } from '@/lib/runner/ambient-dts';

// Self-host Monaco's AMD assets (copied to /public/monaco/vs by
// scripts/copy-monaco.mjs) instead of the default jsDelivr CDN, so this static
// export carries no runtime CDN dependency — same posture as the hand-hosted
// OnionPIR wasm. NEXT_PUBLIC_BASE_PATH is '' on the custom domain (see
// next.config.mjs); the `?? ''` keeps the subpath fallback working.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
loader.config({ paths: { vs: `${basePath}/monaco/vs` } });

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  height = 460,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Invoked on ⌘/Ctrl+Enter inside the editor. */
  onRun?: () => void;
  height?: number;
}) {
  const [dark, setDark] = useState(prefersDark);
  // Keep the latest onRun in a ref so the editor command (bound once at mount)
  // always calls the current handler.
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  // Tailwind uses media-strategy dark mode (no `darkMode` key in
  // tailwind.config.ts), so follow the OS preference for the editor chrome too.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const beforeMount: BeforeMount = (monaco) => {
    const ts = monaco.languages.typescript;
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      // Monaco's bundled TS only exposes Classic/NodeJs (no Bundler); NodeJs
      // is fine — the SDK modules resolve via the ambient lib below, not disk.
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      noEmit: true,
      strict: false,
      esModuleInterop: true,
      skipLibCheck: true,
    });
    const libUri = 'ts:filename/playground-sdk.d.ts';
    // addExtraLib throws if the same uri is added twice (React StrictMode
    // double-invokes in dev) — guard on the existing libs.
    if (!ts.typescriptDefaults.getExtraLibs()[libUri]) {
      ts.typescriptDefaults.addExtraLib(SDK_AMBIENT_DTS, libUri);
    }
  };

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.();
    });
  };

  return (
    <Editor
      height={height}
      path="playground.ts"
      defaultLanguage="typescript"
      theme={dark ? 'vs-dark' : 'light'}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      beforeMount={beforeMount}
      onMount={handleMount}
      loading={<div className="p-4 text-xs text-zinc-500">Loading editor…</div>}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        tabSize: 2,
        lineNumbers: 'on',
        renderLineHighlight: 'none',
        padding: { top: 10, bottom: 10 },
        scrollbar: { alwaysConsumeMouseWheel: false },
        fixedOverflowWidgets: true,
      }}
    />
  );
}

export default CodeEditor;
