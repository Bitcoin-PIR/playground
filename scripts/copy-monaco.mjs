/**
 * Self-host the Monaco editor assets.
 *
 * `@monaco-editor/react` loads the editor core as AMD modules from a
 * configurable `paths.vs` at runtime (default: a jsDelivr CDN). This site is
 * a static export deployed to GitHub Pages and deliberately avoids runtime
 * CDN dependencies (cf. the hand-hosted OnionPIR wasm in public/wasm/), so we
 * copy `monaco-editor/min/vs` into `public/monaco/vs` and point the loader at
 * `/monaco/vs`. See components/playground/CodeEditor.tsx::loader.config.
 *
 * Wired as `predev` + `prebuild` so the assets are present for `next dev`,
 * `next build`, and the Pages workflow alike. `public/monaco` is gitignored.
 */
import { cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
const dest = path.join(root, 'public', 'monaco', 'vs');

if (!existsSync(src)) {
  console.error(
    `[copy-monaco] monaco-editor not found at ${path.relative(root, src)} — run \`npm install\` first.`,
  );
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });
console.log(`[copy-monaco] ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
