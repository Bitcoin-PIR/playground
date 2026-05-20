# Bitcoin PIR — Playground

The developer-facing site for [Bitcoin PIR](https://github.com/Bitcoin-PIR/Bitcoin-PIR).
Three surfaces, one app:

| Surface | Path | Purpose |
| --- | --- | --- |
| **SDK playground** | `/playground` | Paste an address, run a real query against the live server, get the exact TypeScript code your wallet would write. |
| **Wire explorer** | `/explorer` | Inspect every WebSocket frame and verify the four privacy invariants hold on your traffic. |
| **API reference** | `/docs` | Integration guides, SDK reference, protocol spec, privacy guarantees, attestation. |

Built for wallet developers integrating PIR into Bitcoin wallets.

## Quick start

```sh
npm install
npm run sync-vendor   # copy WASM + OnionPIR TS client from the main repo
npm run dev           # http://localhost:3000
```

The `sync-vendor` script copies:

- `pir-sdk-wasm/pkg/` → `vendor/pir-sdk-wasm/` (DPF + HarmonyPIR clients)
- `web/src/onionpir_client.ts` + transitive deps → `vendor/bitcoinpir-web/`
  (OnionPIR client is hand-rolled TS because SEAL doesn&apos;t compile to wasm32)

The vendored snapshot is checked in. Re-run `sync-vendor` after upstream
changes and commit the diff.

## Live servers

- `wss://weikeng1.bitcoinpir.org` — hint server (Hetzner, no SEV)
- `wss://weikeng2.bitcoinpir.org` — query server (VPSBG, SEV-SNP Tier 3)

See [`/docs/operations/endpoints`](app/docs) for the hint/query split.

## Repo layout

```
app/                      Next.js App Router pages
  playground/             SDK playground (feat/playground)
  explorer/               Wire explorer (feat/explorer)
  docs/                   API reference (feat/docs)
components/               Shared React components
content/docs/             MDX sources for the docs site
lib/                      Shared helpers (WASM loader, endpoints, constants)
vendor/
  pir-sdk-wasm/           Vendored wasm-pack output of pir-sdk-wasm
  bitcoinpir-web/         Vendored OnionPIR TS client + its TS deps
scripts/
  sync-vendor.sh          Resync the vendor/ tree from the main repo
```

## License

MIT. See [LICENSE](LICENSE).

The vendored WASM and TS sources are dual-licensed MIT OR Apache-2.0; this
repo re-distributes them under MIT.
