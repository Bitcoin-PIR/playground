import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Deployment: GitHub Pages with a custom domain (sdk.bitcoinpir.org).
// A custom-domain Pages site serves from the root path, so no basePath
// or assetPrefix — runtime fetches like `/wasm/onionpir_client.mjs`
// resolve directly. The `public/CNAME` file (copied verbatim into
// `out/` by `next export`) tells Pages which domain to bind. If you
// ever revert to the bitcoin-pir.github.io/playground subpath, set
// basePath/assetPrefix back to `/playground` here and `delete public/
// CNAME`.
const isPages = process.env.GITHUB_PAGES === '1';

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
  trailingSlash: isPages,
  env: {
    // Always empty — custom domain serves at root, no path prefix.
    // Code that prefixes asset URLs with this (e.g. the OnionPIR
    // factory loader in lib/playground-clients.ts) still works since
    // `'' + '/wasm/foo.mjs' === '/wasm/foo.mjs'`.
    NEXT_PUBLIC_BASE_PATH: '',
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
