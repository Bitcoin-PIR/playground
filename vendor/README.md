# Vendored sources

Snapshots of artifacts from the main
[Bitcoin PIR](https://github.com/Bitcoin-PIR/Bitcoin-PIR) repo. The exact
source commit is recorded in [`SOURCE_COMMIT.txt`](SOURCE_COMMIT.txt).

| Path | Origin | Purpose |
| --- | --- | --- |
| `pir-sdk-wasm/` | `pir-sdk-wasm/pkg/` (wasm-pack output) | DPF + HarmonyPIR clients, Merkle verifier, atomic metrics |
| `bitcoinpir-web/` | `web/src/` (TS sources) | OnionPIR client (hand-rolled TS — SEAL doesn&apos;t compile to wasm32) + shared utilities |

## Updating

Run from this repo&apos;s root with the main repo checked out at the desired commit:

```sh
BITCOINPIR_REPO=/path/to/BitcoinPIR npm run sync-vendor
```

The script overwrites the vendor tree and updates `SOURCE_COMMIT.txt`. Commit
the diff in a `chore(vendor): sync from BitcoinPIR@<sha>` commit.

## Licensing

The vendored sources are dual-licensed MIT OR Apache-2.0 in the main repo.
This repo re-distributes them under MIT (see [../LICENSE](../LICENSE)). The
upstream `LICENSE-APACHE` and `LICENSE-MIT` files are kept under
`pir-sdk-wasm/` for attribution.

## Privacy invariants — do not edit in place

The four MANDATORY privacy invariants documented in the main repo&apos;s
[CLAUDE.md](https://github.com/Bitcoin-PIR/Bitcoin-PIR/blob/main/CLAUDE.md)
are enforced inside these vendored files. **Never edit them in place** —
fixes go upstream, then resync. The wire-explorer feature is the canonical
way to verify the invariants still hold on real traffic.
