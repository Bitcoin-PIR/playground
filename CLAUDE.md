# Bitcoin PIR — Playground Project Memory

The developer-facing site for [Bitcoin PIR](https://github.com/Bitcoin-PIR/Bitcoin-PIR).
Three surfaces (SDK playground, wire-protocol explorer, MDX reference docs) in
one Next.js app. Built for wallet developers integrating PIR.

> **Live at:** https://sdk.bitcoinpir.org/
> **Repo:** https://github.com/Bitcoin-PIR/playground (MIT)
> **Main repo:** https://github.com/Bitcoin-PIR/Bitcoin-PIR (the SDK + servers this site demos)

---

## Stack & deployment

- **Next.js 14** App Router + TypeScript + Tailwind + MDX
- **Static export** (`output: 'export'`) — no server, just static files
- **GitHub Pages** deployed via GitHub Actions (`.github/workflows/pages.yml`)
- **Custom domain** `sdk.bitcoinpir.org` (CNAME committed at `public/CNAME` → copied to `out/CNAME` on build → binds the deployment to the domain)
- **DNS** via Cloudflare: CNAME `sdk → bitcoin-pir.github.io`, **DNS only (gray cloud)**. Don't flip to proxied without setting Cloudflare SSL/TLS to **Full (strict)** — Flexible loops.
- **TLS** Let's Encrypt (R13), auto-renewed by Pages. Expires 2026-08-18.

The `GITHUB_PAGES=1` env in the workflow enables `output: 'export'` + `trailingSlash`. **No `basePath`** because the custom domain serves at root. The OnionPIR runtime URL is prefixed with `process.env.NEXT_PUBLIC_BASE_PATH` (always `''` now) so `${basePath}/wasm/...` resolves to `/wasm/...`.

If you ever revert to the `bitcoin-pir.github.io/playground/` subpath:
1. Delete `public/CNAME`.
2. In `next.config.mjs` re-add `basePath: '/playground'` + `assetPrefix: '/playground/'` + `NEXT_PUBLIC_BASE_PATH: '/playground'` — all gated on `isPages`.

---

## Repo layout

```
app/                      Next.js App Router pages
  page.tsx                landing
  playground/page.tsx     SDK playground (live query runner)
  explorer/               wire explorer
    page.tsx
    ExplorerClient.tsx
  docs/                   MDX reference
    layout.tsx            sidebar nav
    page.tsx              landing
    [...slug]/page.tsx    dynamic MDX router (generateStaticParams)
components/
  Header.tsx, Footer.tsx, BackendSelector.tsx     shared
  playground/             AddressInput, QueryRunner, ResultPanel,
                          EditableRunner, CodeEditor (Monaco), AttestationBadge,
                          QuickStartCard
  explorer/               FrameTimeline, InvariantStatus, PaddingViz,
                          MerkleCountChart, FoundVsNotFoundDiff,
                          HarmonyTCheck
  docs/                   Sidebar, PrevNext, Callout, Invariant,
                          BackendMatrix, nav.ts
content/docs/**/*.mdx     14 MDX pages (quickstart, concepts,
                          protocol/{dpf,harmonypir,onionpir,wire-format},
                          sdk/{typescript,rust}, privacy/{invariants,
                          attestation}, operations/endpoints, troubleshooting)
lib/
  wasm-loader.ts          one-shot dynamic-import of pir-sdk-wasm
  endpoints.ts            PIR1_URL = wss://weikeng1, PIR2_URL = wss://weikeng2
  address.ts              parseAddress() → {spk, sh160, scriptType}
  snippet.ts              per-backend TS snippet generator (seeds the editable
                          runner — must stay RUNNABLE, not just illustrative)
  playground-clients.ts   runDpfQuery, runHarmonyQuery, runOnionPirQuery,
                          ensureOnionWasmFactory (exported)
  runner/                 in-browser editable code runner (see Recent history)
    module-map.ts         require() shim → same live SDK bindings as above
    run-user-code.ts      Sucrase transpile + new Function execute (in-browser)
    safety-lint.ts        non-blocking attest/Merkle heuristic warnings
    ambient-dts.ts        Monaco IntelliSense lib for the SDK modules
  explorer/
    frame-tap.ts          window.WebSocket monkey-patch + opcode classifier
    invariants.ts         5-invariant report; APPLICABLE map per backend
    diff.ts               found-vs-not-found wire-shape diff
    runner.ts             runDpf / runHarmony / runOnion drivers
vendor/
  SOURCE_COMMIT.txt       BitcoinPIR commit hash this vendor was synced from
  README.md               vendor docs + sync instructions
  pir-sdk-wasm/           wasm-pack output: pir_sdk_wasm.{js,d.ts,_bg.wasm}
  bitcoinpir-web/         OnionPIR TS client + 22 shared TS files from
                          BitcoinPIR/web/src/
public/
  CNAME                   sdk.bitcoinpir.org (binds Pages custom domain)
  monaco/                 GITIGNORED — Monaco vs assets copied from node_modules
                          by scripts/copy-monaco.mjs on predev/prebuild
  wasm/
    onionpir_client.mjs   OnionPIR FHE runtime (hand-rolled, SEAL doesn't
    onionpir_client.wasm  compile to wasm32)
scripts/
  sync-vendor.sh          BITCOINPIR_REPO=... npm run sync-vendor
  copy-monaco.mjs         self-host Monaco vs → public/monaco (predev/prebuild)
.github/workflows/
  ci.yml                  typecheck + lint + build on push/PR
  pages.yml               static-export build → upload-pages-artifact → deploy
mdx-components.tsx        MDX prose styles + registers <Callout>, <Invariant>,
                          <BackendMatrix>
next.config.mjs           static export config (see Stack & deployment above)
tailwind.config.ts        content: app/components/content/mdx-components.tsx
tsconfig.json             path aliases: @/*, @vendor/web/*, @vendor/wasm,
                          @vendor/wasm/*, pir-sdk-wasm
.claude/launch.json       preview server config (port 3000)
```

---

## Vendor convention — DO NOT EDIT vendor/

The `vendor/` tree is a snapshot. Fixes go upstream first, then resync:

```sh
BITCOINPIR_REPO=/path/to/BitcoinPIR npm run sync-vendor
# overwrites vendor/* + records new SOURCE_COMMIT.txt
git diff vendor/SOURCE_COMMIT.txt
git commit -am "chore(vendor): sync from BitcoinPIR@<sha>"
```

The privacy invariants are enforced inside `vendor/`. Editing in place silently desynchronizes them from the source-of-truth in the main repo — see CLAUDE.md in the main repo for the four MANDATORY invariants and what enforces them. The wire explorer's `InvariantStatus` panel is the live audit of those invariants against actual traffic.

---

## Privacy invariants — what the explorer checks per backend

Source of truth: CLAUDE.md in the main `Bitcoin-PIR/Bitcoin-PIR` repo. Mirror here:

| # | Invariant | DPF | HarmonyPIR | OnionPIR |
| --- | --- | --- | --- | --- |
| 1 | Query padding (K=75, K_CHUNK=80) | **wire** (groupCount on 0x11/0x21) | **wire** (num_groups on 0x43) | SDK (FHE-internal) |
| 2 | CHUNK Round-Presence | **wire** (0x21 follows 0x11) | SDK (0x43 indistinguishable across axes) | **wire** (0x52 follows 0x51) |
| 3 | Merkle INDEX Item-Count = 2 | **wire** (0x33) | SDK (Merkle rides 0x43) | **wire** (0x53/0x55) |
| 4 | HarmonyPIR Per-Group Request-Count = T−1 | n/a | **wire** (via wasm-bindgen `harmony_decode_counts`) | n/a |
| 5 | INDEX Merkle Group-Symmetry (PBC plan) | **wire** | SDK | n/a (single-query trace lacks data) |

**Applicable matrix** lives at `lib/explorer/invariants.ts::APPLICABLE`. Backend → invariant IDs that get rendered. Invariants outside the matrix for the current backend are filtered out (not rendered as `n/a`).

**No `internal` state.** A property that holds is `pass`, whether verified from the wire or trusted via SDK code. Where it's verified lives in the row summary text + `Verified at` detail row, not in the badge.

**Backend-specific gotchas**:
- HarmonyPIR opcode `0x43` carries INDEX + CHUNK + Merkle queries indistinguishably. The wire layer can't tell which is which, so invariants 2/3/5 are SDK-trusted on Harmony traces.
- HarmonyPIR `0x43` has a different wire layout from DPF `0x11/0x21`: `num_groups` is `u16 LE` at offset 8 (not `u8` at offset 7). `frame-tap.ts::classify` handles both.
- The decoder `harmony_decode_counts` (added in pir-sdk-wasm PR #6) is loaded once in `ExplorerClient.tsx` via `loadWasm()`, passed to `checkInvariants(frames, { harmonyDecodeCounts }, backend)`.
- OnionPIR runtime needs `globalThis.__onionpirWasmFactory` installed before `OnionPirWebClient` is constructed — see `lib/playground-clients.ts::ensureOnionWasmFactory` (exported, also used by the explorer's `runOnion`).

---

## Servers (the SDK talks to these)

| Endpoint | Role | Hardware | Attestation |
| --- | --- | --- | --- |
| `wss://weikeng1.bitcoinpir.org` | hint + DPF + OnionPIR query | Hetzner i7-8700 (no SEV) | binary SHA-256 pin only |
| `wss://weikeng2.bitcoinpir.org` | HarmonyPIR query (`--serve-queries` only, no OnionPIR) | VPSBG SEV-SNP, Tier 3 UKI | SEV-SNP MEASUREMENT + binary SHA-256 |

Pins live in `vendor/bitcoinpir-web/attest-pin.ts`. Both servers run the **same** reproducible `nix build .#unified-server` binary (currently `bb2cf422…`, **v24** from the 2026-06 security review) — so `PIR1_PIN.binarySha256Hex == PIR2_TIER3_PIN.binarySha256Hex`. pir2's Tier-3 UKI **v24** embeds the same binary; MEASUREMENT is `59ab13f5…`. Both servers also dispatch `REQ_ANNOUNCE` (operator-signed identity — live upstream since 2026-05-28, verified end-to-end): the playground's "verified operator" badge (repo PR #5) gates **only** on `operatorIdentity.serverN.state === 'verified'` against `attest-pin.ts::PIR_OPERATOR_PUBKEY_HEX` — never on `chainVerified` alone (a MITM can self-sign a consistent bundle).

If a redeploy bumps either SHA or MEASUREMENT: update `vendor/bitcoinpir-web/attest-pin.ts` in the main repo, push, resync vendor here.

---

## Build commands

```sh
npm install                     # first-time
npm run dev                     # local dev, http://localhost:3000
npm run typecheck               # tsc --noEmit
npm run lint                    # next lint
npm run build                   # dev build (with basePath / SSR / etc as configured)
GITHUB_PAGES=1 npm run build    # production static export → out/
npm run sync-vendor             # resync vendor/ from $BITCOINPIR_REPO
npm run copy-monaco             # self-host Monaco assets (auto on predev/prebuild)
```

`out/` is `.gitignored`. CI workflow runs typecheck + lint + build. Pages workflow runs `GITHUB_PAGES=1 npm run build` then ships `out/` (including `out/CNAME`).

Preview server: `.claude/launch.json` has a `playground` entry on port 3200.

---

## Recent history (2026-06-11) — v24 security-review re-vendor

Re-vendored everything from BitcoinPIR `main @ 024c72ff` (the v24 fleet redeploy from the **2026-06 security review** — `docs/CODE_REVIEW_2026-06.md`, PR #19, merge `5f70ae8b`) and redeployed the site:
- **Pins:** `PIR1_PIN` + `PIR2_TIER3_PIN` `binarySha256Hex` → `bb2cf422…` (shared-binary invariant preserved); `PIR2_TIER3_PIN.measurementHex` → `59ab13f5…` (Tier-3 UKI **v24**). Lineage: `f7df82d0…` (v22) → `57ac525b…` (v23) → `bb2cf422…` (v24).
- **Security fixes vendored:** **W1** — unsound `verifyMerkleProof` removed from `merkle.ts` (it never bound the leaf into the recomputed root), along with `computeLeafHash`/`parseTreeTopCache`; real proof walks live in the wasm (`verifyBucketMerkleItem`) + OnionPIR `walkTreeTopToRoot`. No playground code referenced the removed exports. **W3** — adapter `teardown()` now async: nulls the wasm-client handle first (no concurrent double-free) and awaits `disconnect()` before `free()` (wasm-bindgen borrow race); public `disconnect(): void` unchanged, so call sites needed nothing. **C7** — the wasm now rejects malicious catalog geometry (server-supplied `index_k`/`chunk_k` < 3 previously wedged the client in an infinite rejection-sampling loop; zero-bin DBs too) — `validate_db_geometry` error strings confirmed present in the vendored `.wasm`.
- **Wasm rebuilt from source** (`wasm-pack build --target web`) rather than trusting the stale `pkg/`; `.d.ts` diff was wasm-bindgen closure-hash churn only — no public API change, `lib/runner/module-map.ts` + `ambient-dts.ts` untouched.
- `SOURCE_COMMIT.txt` → `024c72ff` (annotated: main-repo tree dirty only in non-vendored `.github/workflows/` + `docs/`).
- **Verified against production pre-deploy** (local build, real servers): all three backends return the known-good 2 UTXOs / 1,284 sats for `1Q2TWHE3…`; pir1 `NO SEV — PIN ONLY` with `binary=bb2cf422…`; pir2 **`AMD CHAIN OK` / "AMD VCEK chain validated"** with the v24 binary + measurement; both servers `🔏 OPERATOR-ENDORSED` under the pinned key (the PR #5 badge — shipped earlier without a history entry — works against v24); console clean (no W3 teardown noise). `typecheck` + `lint` + static-export build green; old pins absent from the built bundle.

## Recent history (2026-05-27) — light/dark theme toggle

Added a user-facing **light/dark theme toggle** (sun/moon button in the shared `Header`, so it appears on every page). The site already had `dark:` variants everywhere but only followed the OS via Tailwind's default *media* strategy — there was no manual control.
- **Strategy switch:** `tailwind.config.ts` → `darkMode: 'class'`. Single source of truth is the **`dark` class on `<html>`**.
- **No flash on the static export:** a blocking inline `<head>` script (`lib/theme.ts::THEME_INIT_SCRIPT`, rendered by `app/layout.tsx`) sets the class before first paint from `localStorage` (fallback = OS preference). `<html>` carries `suppressHydrationWarning` because that script mutates the class pre-hydration.
- **Toggle:** `components/ThemeToggle.tsx` calls `lib/theme.ts::toggleTheme()` — flips the class + persists to `localStorage`. The sun/moon icon is **pure CSS** (`dark:` variants), so it's hydration-safe with no React state.
- **Native controls:** `app/globals.css` ties `color-scheme` to the class (`:root` light, `.dark` dark) so number inputs / scrollbars match the chosen theme.
- **Monaco follows it too:** `components/playground/CodeEditor.tsx` now reads the `dark` class via `lib/use-theme-mode.ts::useThemeMode()` (a `MutationObserver` on `<html>`) instead of its own `matchMedia` listener — the editor chrome tracks the toggle (`vs-dark` ↔ `light`).
- **Module split (gotcha):** `lib/theme.ts` stays **React-free** so the Server-Component layout can import `THEME_INIT_SCRIPT`; the `useThemeMode` hook lives separately in `lib/use-theme-mode.ts` (client-only). A Server Component importing a module that pulls in `useState`/`useEffect` is a build error.
- **Deliberate exception:** the captured-console / `Log` panels (playground output, rate-limiting) keep a fixed dark background in both themes — intentional terminal styling, not a miss.
- Bundled with a small layout fix: the `/rate-limiting` intro paragraph + amber dev-issuer note dropped `max-w-3xl` to span the full `container-wide` width (was stopping at ~60%).
- **Verified:** `typecheck` + `lint` + static-export build green; toggle round-trips light↔dark + persists across reload with no flash; Monaco flips with it. **No vendor/server change** — pins unchanged. Commits `564ecc6` (rate-limiting width) + `14d0181` (toggle); deployed live.

## Recent history (2026-05-27) — wasm WS-teardown fix vendored

Re-vendored `pir-sdk-wasm` to pick up the upstream **WebSocket-teardown fix** the editable runner surfaced (BitcoinPIR `main @ c0daf855`, PR #15; fix commit `ae5144be`):
- **Bug:** every DPF/HarmonyPIR query threw an unhandled `closure invoked recursively or after being dropped` during WS teardown — dev-overlay-only (no overlay in the static export), results always correct, and it reproduced on the original "Run query" path too (not introduced by the runner). Root cause = **drop-before-detach** in `pir-sdk-client/src/wasm_transport.rs` (`WasmWebSocketTransport`): `close()` dropped the WS `Closure`s without first clearing `set_onclose`/`onmessage`/`onerror`/`onopen`, and there was no `Drop` impl — so the browser's next-tick `close` event invoked a freed closure. That's also why `client.free()` after `disconnect()` didn't suppress it.
- **Fix (upstream, wasm32-only, no wire/protocol/server change):** an idempotent `detach_ws_handlers(ws)` (all four handlers → `None`) called BEFORE `ws.close()` and before dropping the closures, plus an `impl Drop` covering the `free()`/drop path.
- **Vendor diff:** only `pir_sdk_wasm_bg.wasm` changed (+81 bytes); `.js` glue, `.d.ts`, and all `bitcoinpir-web` TS byte-identical. `SOURCE_COMMIT.txt` → `c0daf855`. **Server pins unchanged** (client-only fix — no redeploy).
- **Verified live** in-browser against production: DPF + HarmonyPIR both return correct UTXOs (1,284 sats, Merkle passing) and the teardown throw is **gone** on both (no dev overlay, clean console). Coordinated with the BitcoinPIR repo agent via agent-mailbox.

## Recent history (2026-05-26) — editable in-browser code runner

The playground's right-hand panel went from a **read-only snippet** to an **editable, fully in-browser TypeScript runner** ("Edit & run the SDK code"):
- **What:** Monaco editor (`components/playground/{EditableRunner,CodeEditor}.tsx`) seeded from `lib/snippet.ts`, with a Run button + captured-console output panel. `lib/runner/` does the work: Sucrase strips types + rewrites imports to `require()`, then `new Function` runs it in an async IIFE with a `require` shim (`module-map.ts`) bound to the **same live SDK bindings `playground-clients.ts` uses** — so the editable path can't silently diverge from the structured one.
- **In-browser, no server:** transpile + execute are client-side; the only network call is the PIR query's WebSocket (already true before). Nothing is sent anywhere to compile/eval.
- **Safety = surface, not enforce** (matches "no invariant-violating controls"): the whole snippet is editable, but `safety-lint.ts` shows a **non-blocking** amber banner if `verifyMerkleBatch` / `attest` / `upgradeToSecureChannel` go missing.
- **Monaco self-hosted** (no CDN): `scripts/copy-monaco.mjs` copies `min/vs` → `public/monaco` on `predev`/`prebuild`; `public/monaco` is gitignored. Loaded lazily (`next/dynamic ssr:false`) so `/playground` First Load JS barely moves. Deps added: `@monaco-editor/react`, `monaco-editor`, `sucrase`.
- **Snippet fixes surfaced by actually running them:** the DPF snippet was missing `await client.fetchCatalog()` (threw `invalid state: no catalog`); added it + `client.free()` on both wasm snippets to match `runDpfQuery`'s lifecycle.
- **Verified live** in-browser against production: DPF (`1Q2TWHE3…` → 1,284 sats, ~9 s) and OnionPIR (same address, ~57 s, FHE) both return correct UTXOs with Merkle passing; lint banner appears + stays non-blocking. `typecheck` / `lint` / static-export build all green.
- **Known wart (pre-existing, NOT from this change) — since FIXED:** the wasm WS-teardown error this surfaced was fixed upstream + re-vendored the next day (see the 2026-05-27 entry above).

## Recent history (2026-05-26)

Re-vendored the **v23 attestation pins** from `Bitcoin-PIR/Bitcoin-PIR` `main @ c322e825` (PR #12) and redeployed (commit `6f3003c`):
- **Why:** upstream shipped a **correctness fix** — DPF-PIR + HarmonyPIR were returning **0 UTXOs for funded addresses** (an anchor-aware cuckoo table-offset bug, server-side: `pir-runtime-core/src/table.rs`, `build/src/merkle_bucket_builder.rs`, `runtime/src/hint_pool.rs`). Both servers redeployed on a new reproducible binary `57ac525b…`, so this site's v22 pin (`f7df82d0…`) went stale → `binary_sha256` mismatch / channel-binding failure → DPF/HarmonyPIR wouldn't hold a connection.
- **What:** `PIR1_PIN` + `PIR2_TIER3_PIN` `binarySha256Hex` → `57ac525b…`; `PIR2_TIER3_PIN.measurementHex` → `4fb0ad57…` (VPSBG Tier-3 UKI **v23**). Fix is **server-side only** → vendored `pir-sdk-wasm` byte-identical, no rebuild. ARK + operator pubkey unchanged; manifest root not pinned. Pin lineage: …`f7df82d0…` (v22) → `57ac525b…` (v23).
- **Verified live** (local build against the production servers): DPF + HarmonyPIR both attest clean (pir1 `unsupported`/pin-ok, pir2 `verified-vcek`) and now return correct UTXOs — `1D4HSHPJ…` → 1,600 sats, `bc1q2292…` → 12,900 sats — Merkle passing. OnionPIR unaffected.

## Recent history (2026-05-25)

Re-vendored the **v22 attestation pins** from `Bitcoin-PIR/Bitcoin-PIR` `main @ 48c6f88b` (PR #11) and redeployed the site (commit `0f59532`):
- **Why:** upstream redeployed both servers on a new reproducible binary `f7df82d0…` (was `71a041ae…`), but this site still pinned the old hash → attestation `mismatch` → clients fell back to **cleartext**. Re-pinning closed that live privacy regression.
- **What:** `PIR1_PIN` + `PIR2_TIER3_PIN` `binarySha256Hex` → `f7df82d0…`; `PIR2_TIER3_PIN.measurementHex` → `41461a88…` (VPSBG Tier-3 UKI **v22**; `ReportDataMatch` on real hardware). Pins are pure TS in `attest-pin.ts` — no WASM rebuild; vendored WASM stayed byte-identical.
- **Pin lineage:** 2026-05-20 `2ba6e79c…` (UKI v18) → 2026-05-24 `71a041ae…` (v20, onion v2-anchor SEGV fix) → 2026-05-25 `f7df82d0…` (v22). v21 was a mis-deploy that crash-looped.
- `sync-vendor` also pulled in **dormant, default-off** operator-identity announce client code (`dpf-adapter`/`sdk-bridge`/`onionpir_client`) + `PIR_OPERATOR_PUBKEY` pin. **Not** wired into any UI: the playground never sets `verifyOperatorIdentity`, and the servers don't dispatch `REQ_ANNOUNCE` yet (`0x07-unsupported`). See "Open follow-ups".

## Recent history (2026-05-20)

Three parallel agents bootstrapped the repo (PRs #1/#2/#3 in *this* repo):
- **A** — SDK playground UI, live queries against pir1/pir2 for all three backends
- **B** — wire explorer with frame-tap, invariant checks, found-vs-not-found diff
- **C** — 14 MDX docs pages (quickstart, concepts, SDK ref, protocol, privacy, ops)

Live testing revealed gaps. Three parallel agents fixed them upstream in the main repo (Bitcoin-PIR/Bitcoin-PIR PRs):
- **#5** `fix(web): three small vendor-cleanup items` — `webpackIgnore: true` on OnionPIR loader; deleted dead `web/src/dpf.ts` + `libdpf` dep; added V2 Harmony opcodes (`0x44`/`0x46`) to `constants.ts`
- **#6** `feat(wasm): expose harmony_decode_counts` — `#[wasm_bindgen]` decoder for HARMONY_BATCH_QUERY per-group counts; closes the T−1 invariant at the wire layer
- **#7** `perf(harmony): coalesce per-group hint stream` — server batches up to ~768 KiB (Cloudflare ceiling) of length-prefixed records per `Message::Binary`; clients gain a demux buffer in `ws.ts`/`connection.rs`/`wasm_transport.rs`. Wire frame count for one HarmonyPIR query: **622 → 59** (10.5×).

Production redeployed:
- pir1 (Hetzner): on-host `nix build .#unified-server` → swap → restart. SHA `2ba6e79c…`.
- pir2 (VPSBG): `nix build --impure .#tier3-uki` on Hetzner → SCP UKI to local → user uploaded via VPSBG portal → reboot into Tier 3. UKI SHA `fbb9a246…`, MEASUREMENT `53eb0033…`, attestation `ReportDataMatch ✓`.

Vendor resynced; pins bumped on both repos.

Explorer reworked after live testing surfaced confusion:
- Per-backend filter (`APPLICABLE` map). DPF traces no longer show the HarmonyPIR T−1 row.
- Single `PASS` for wire-verified AND SDK-verified properties (no more `IN SDK` label).
- 0x43 `num_groups` parsing wired into invariant 1.
- `harmony_decode_counts` wired into invariant 4 via the new `InvariantContext` API.
- OnionPIR runner switched from stub to real query (`ensureOnionWasmFactory` exported).
- `NEXT_PUBLIC_BASE_PATH` env var added so the OnionPIR runtime URL resolves at both `/playground/` (subpath build) and `/` (custom domain build).

Migrated from `bitcoin-pir.github.io/playground/` → `sdk.bitcoinpir.org`:
- Cloudflare DNS: CNAME `sdk` → `bitcoin-pir.github.io` (DNS only)
- GitHub Pages custom domain set via `gh api PUT repos/Bitcoin-PIR/playground/pages -f cname=sdk.bitcoinpir.org`
- Let's Encrypt cert auto-provisioned (R13, valid until 2026-08-18)
- `https_enforced=true` automatically set by Pages once cert approved
- `next.config.mjs` dropped `basePath`/`assetPrefix`; `NEXT_PUBLIC_BASE_PATH = ''` always
- `public/CNAME` committed so every build ships the custom-domain binding

---

## Open follow-ups (next session candidates)

- **Electrum plugin wire-parser audit** — Bitcoin-PIR/Bitcoin-PIR PR #7 changed the client-side wire-parsing contract (1 WS message no longer == 1 record; demux buffer required). The Electrum plugin has its own Python parser; verify it handles batched messages before flipping any other clients.
- **OnionPIR multi-query batches** — invariant 5 (INDEX Merkle Group-Symmetry) shows as `n/a` on single-query OnionPIR traces because the trace lacks the multi-query structure. The `lib/explorer/invariants.ts` notes this. A future "batch query" UI would let users empirically check it.
- **ARC + Cashu anonymous rate-limiting** — main repo has the server side (`pir-runtime-core/src/arc`, etc.). Surfacing it in the playground (so users can mint credentials, see them attached to queries) is a real UI project. See main repo memory `project_anonymous_rate_limiting`.
- **BDK wallet** — see main repo `docs/BDK_WALLET_PROTOTYPE.md`. The playground might eventually demo wallet integration alongside the existing single-address query demo.
- **Cloudflare proxy** — currently DNS only. Could flip to Proxied + Full (strict) SSL for edge cache + DDoS, but the Pages cert is fine and the site is fast enough as-is. Defer unless there's a reason.

---

## Things NOT to do

- **Don't edit `vendor/*` in place.** Fix upstream in the main repo, then resync. The privacy invariants are enforced there; editing in vendor desyncs the proof.
- **Don't add UI controls that could violate the privacy invariants** — e.g. "skip padding for performance", "fast not-found mode", "expose dummy markers". Even if the underlying SDK supports a flag, the playground should not. The site exists to demonstrate the privacy property; toggles that break it are anti-marketing.
- **Don't hardcode `/playground` anywhere.** Custom domain is at root. Use `process.env.NEXT_PUBLIC_BASE_PATH` (always `''`) if you need a base.
- **Don't push to main without typecheck + build passing.** The CI workflow catches it but you'll get a failed Pages deploy.
- **Don't add `next dev` cache to .git** (it's `.gitignored`; if Next.js writes a new state file, add it there).
- **Don't commit `public/monaco`.** It's gitignored and regenerated from `node_modules` by `scripts/copy-monaco.mjs` on `predev`/`prebuild` (~15 MB of Monaco `vs` assets).

---

## Operations note: when the deploy looks broken

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `ERR_CERT_COMMON_NAME_INVALID` on `sdk.bitcoinpir.org` | Cert hasn't provisioned yet OR Cloudflare proxy is on but SSL mode is Flexible | Wait 5-30 min; verify `gh api repos/Bitcoin-PIR/playground/pages` shows `https_certificate.state` = `issued`/`approved`; ensure Cloudflare proxy is OFF or SSL = Full (strict) |
| Pages workflow fails on push | Probably typecheck or lint regression introduced upstream | `npm run typecheck` + `npm run lint` locally, fix, push |
| `OnionPIR — Failed to fetch /wasm/onionpir_client.mjs` | `NEXT_PUBLIC_BASE_PATH` not in sync with deploy path | Verify `next.config.mjs` env block matches the deploy URL (root = `''`, subpath = `/playground`) |
| Live HarmonyPIR query emits ~622 hint frames again | The new server binary got rolled back, or pir1/pir2 are running the pre-#7 binary | Re-run `nix build .#unified-server` + redeploy on pir1; rebuild UKI (current: v24) + redeploy on pir2 |
| `UNKNOWN_0x44` / `UNKNOWN_0x46` reappears in the wire timeline | Vendor `constants.ts` got resynced from a pre-#5 commit | Resync from main `>= 7d54428d` |

---

## Pin / hash reference (as of 2026-06-11)

- Reproducible unified_server binary: SHA-256 `bb2cf422f90ab8f8033ba42203cb95af3e0d3fd45ad3480ec8fb0f7a54922439` (v24, 2026-06 security review)
- Tier 3 UKI: **v24** (2026-06-11) — the SEV-SNP MEASUREMENT below is the attested value; clients pin the binary SHA + MEASUREMENT, not the UKI file (upstream notes UKI file sha256 `4eefec07…`).
- SEV-SNP MEASUREMENT (Tier 3 UKI v24): `59ab13f573e170febe49dd24cea5e3674da35a4662c060404e1fc8cb500e45520fa1330789f64849bb1ef41ffc44c70c`
- Operator (Tier-1) identity pubkey: `256fb106c039f8009d3caa431a9634ff3fe5db3b9e4d9ae7282bbde66772c97a` — pinned in `attest-pin.ts::PIR_OPERATOR_PUBKEY_HEX`. **Live:** both servers dispatch `REQ_ANNOUNCE`; the playground's badge (repo PR #5) gates on `operatorIdentity.serverN.state === 'verified'`.
- AMD Turin ARK fingerprint: `1f084161a44bb6d93778a904877d4819cafa5d05ef4193b2ded9dd9c73dd3f6a` (unchanged)
- BitcoinPIR commit currently vendored: see `vendor/SOURCE_COMMIT.txt` (now `024c72ff` — 2026-06 security review v24; was `c0daf855`)
