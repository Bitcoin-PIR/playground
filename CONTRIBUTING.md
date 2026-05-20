# Contributing

## Branches

We develop the three surfaces in parallel:

| Branch | Owns |
| --- | --- |
| `main` | Shared scaffolding, layout, vendor, MIT LICENSE, CI |
| `feat/playground` | `app/playground/**`, playground-specific components |
| `feat/explorer` | `app/explorer/**`, explorer-specific components |
| `feat/docs` | `app/docs/**`, `content/docs/**`, MDX components |

Rebase your feature branch on `main` before opening a PR. Merge order is
docs → playground → explorer to minimize conflicts.

**Shared surface ownership.** Anything under `components/`, `lib/`, `vendor/`,
or the root config files belongs to `main`. If your feature needs a new
shared component or lib helper, open a small PR to `main` first, get it
merged, then rebase your feature branch.

## Vendor sync

WASM and OnionPIR TS sources live in `vendor/` and are vendored from the
main [Bitcoin PIR](https://github.com/Bitcoin-PIR/Bitcoin-PIR) repo. To
refresh:

```sh
# from a clone of the main repo at the desired commit:
BITCOINPIR_REPO=/path/to/BitcoinPIR npm run sync-vendor
git diff vendor/SOURCE_COMMIT.txt   # verify the new pin
git commit -am "chore(vendor): sync from BitcoinPIR@<sha>"
```

The sync script writes the source commit hash to `vendor/SOURCE_COMMIT.txt`
so reviewers can audit what was synced.

## Style

- Tailwind utility classes; no global CSS beyond `app/globals.css`
- Use `'use client'` only when you need state, effects, or browser APIs
- Code blocks in MDX use ` ```ts ` / ` ```sh ` etc.; `rehype-pretty-code`
  syntax-highlights at build time
- Run `npm run lint` and `npm run typecheck` before pushing

## License

By contributing, you agree your contribution is licensed under MIT.
