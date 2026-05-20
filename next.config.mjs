import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages deploy at https://bitcoin-pir.github.io/playground/.
// Set GITHUB_PAGES=1 to enable static export + basePath; unset for normal dev.
const isPages = process.env.GITHUB_PAGES === '1';
const basePath = isPages ? '/playground' : '';
// Exposed to the client so runtime fetches of /public assets (e.g.
// the OnionPIR FHE module at /wasm/onionpir_client.mjs) can be
// prefixed correctly. Without this they 404 on the deployed site.
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: { dark: 'github-dark', light: 'github-light' },
          keepBackground: false,
        },
      ],
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  reactStrictMode: true,
  output: isPages ? 'export' : undefined,
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: isPages,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    // Vendored TS sources from BitcoinPIR/web use `import './foo.js'`
    // (TypeScript-style ESM with explicit extensions); tell webpack to
    // resolve `.js` to the matching `.ts` when present.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    // The vendored `sdk-bridge.ts` carries a dynamic `import('pir-sdk-wasm')`
    // (intended to consume the npm package).  Alias that bare specifier onto
    // the local wasm-pack output so webpack resolves it without us having
    // to publish the package.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      'pir-sdk-wasm': path.resolve(
        __dirname,
        'vendor/pir-sdk-wasm/pir_sdk_wasm.js',
      ),
    };
    return config;
  },
};

export default withMDX(nextConfig);
