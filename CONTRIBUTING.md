# Contributing

## Branching

Single-trunk: develop on a topic branch off `main`, open a PR, merge
to `main`. The original parallel-feature-branch workflow
(`feat/playground` / `feat/explorer` / `feat/docs`) that bootstrapped
the repo has been folded into `main` since the three surfaces
shipped.

See [`CLAUDE.md`](CLAUDE.md) for the project memory and operational
context that should inform any change.

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
