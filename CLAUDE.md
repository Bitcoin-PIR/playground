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
                          CodeSnippet, AttestationBadge, QuickStartCard
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
  snippet.ts              per-backend TS snippet generator
  playground-clients.ts   runDpfQuery, runHarmonyQuery, runOnionPirQuery,
                          ensureOnionWasmFactory (exported)
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
  wasm/
    onionpir_client.mjs   OnionPIR FHE runtime (hand-rolled, SEAL doesn't
    onionpir_client.wasm  compile to wasm32)
scripts/
  sync-vendor.sh          BITCOINPIR_REPO=... npm run sync-vendor
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

Pins live in `vendor/bitcoinpir-web/attest-pin.ts`. Both servers run the **same** reproducible `nix build .#unified-server` binary (currently `f7df82d0…`) — so `PIR1_PIN.binarySha256Hex == PIR2_TIER3_PIN.binarySha256Hex`. pir2's Tier-3 UKI **v22** embeds the same binary; MEASUREMENT is `41461a88…`. The v22 binary also stages operator-signed identity (`--identity-*`), but the `REQ_ANNOUNCE` *dispatch* arm isn't deployed yet — servers answer `0x07-unsupported` — so the announce flow is **dormant** and no client verifies operator identity. Don't surface a "verified operator" badge until upstream ships + re-pins a dispatch-arm binary (see `vendor/bitcoinpir-web/attest-pin.ts::PIR_OPERATOR_PUBKEY_HEX`).

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
```

`out/` is `.gitignored`. CI workflow runs typecheck + lint + build. Pages workflow runs `GITHUB_PAGES=1 npm run build` then ships `out/` (including `out/CNAME`).

Preview server: `.claude/launch.json` has a `playground` entry on port 3200.

---

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

- **Operator-identity "verified operator" badge** — the v22 vendor sync (2026-05-25) pulled in the operator-signed-identity announce client (`dpf-adapter.ts` config `verifyOperatorIdentity` + `adapter.operatorIdentity.serverN`) and the `PIR_OPERATOR_PUBKEY` pin, but the UI doesn't use them. **Double-blocked, do not wire yet:** (1) the vendored `pir-sdk-wasm` predates the announce verifier (lacks `checkPinnedOperator`/`checkChannelBinding`/`verifyAnnounceResponse`) — needs a `wasm-pack build` + resync; (2) the servers don't dispatch `REQ_ANNOUNCE` yet (`0x07-unsupported`), so the state can never reach `'verified'`. When both clear: gate the badge **only** on `operatorIdentity.serverN.state === 'verified'` (never `chainVerified` alone — a MITM can self-sign a consistent bundle). Full spec in the original `ANNOUNCE_V22_HANDOFF.md` (Task 2) + main repo `docs/OPERATOR_IDENTITY.md`.
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

---

## Operations note: when the deploy looks broken

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `ERR_CERT_COMMON_NAME_INVALID` on `sdk.bitcoinpir.org` | Cert hasn't provisioned yet OR Cloudflare proxy is on but SSL mode is Flexible | Wait 5-30 min; verify `gh api repos/Bitcoin-PIR/playground/pages` shows `https_certificate.state` = `issued`/`approved`; ensure Cloudflare proxy is OFF or SSL = Full (strict) |
| Pages workflow fails on push | Probably typecheck or lint regression introduced upstream | `npm run typecheck` + `npm run lint` locally, fix, push |
| `OnionPIR — Failed to fetch /wasm/onionpir_client.mjs` | `NEXT_PUBLIC_BASE_PATH` not in sync with deploy path | Verify `next.config.mjs` env block matches the deploy URL (root = `''`, subpath = `/playground`) |
| Live HarmonyPIR query emits ~622 hint frames again | The new server binary got rolled back, or pir1/pir2 are running the pre-#7 binary | Re-run `nix build .#unified-server` + redeploy on pir1; rebuild UKI (current: v22) + redeploy on pir2 |
| `UNKNOWN_0x44` / `UNKNOWN_0x46` reappears in the wire timeline | Vendor `constants.ts` got resynced from a pre-#5 commit | Resync from main `>= 7d54428d` |

---

## Pin / hash reference (as of 2026-05-25)

- Reproducible unified_server binary: SHA-256 `f7df82d04fb4a02fa51f6d595f04ea302fefece7da15b33bd30c7102f9729101`
- Tier 3 UKI: **v22** (2026-05-25) — the SEV-SNP MEASUREMENT below is the attested value. No standalone UKI file SHA-256 was published this release; clients pin the binary SHA + MEASUREMENT, not the UKI file. (v21 was a mis-deploy that crash-looped; v22 is correct.)
- SEV-SNP MEASUREMENT (Tier 3 UKI v22): `41461a8856cc2ca9e2157c7e71fb75c618c03e4d28f5dac4346cefe528229f906568ed8effc934e31ada9c6afaee786e`
- Operator (Tier-1) identity pubkey: `256fb106c039f8009d3caa431a9634ff3fe5db3b9e4d9ae7282bbde66772c97a` — pinned in `attest-pin.ts::PIR_OPERATOR_PUBKEY_HEX`. **Dormant:** the `REQ_ANNOUNCE` dispatch arm isn't deployed (servers answer `0x07-unsupported`), so no client verifies operator identity yet.
- AMD Turin ARK fingerprint: `1f084161a44bb6d93778a904877d4819cafa5d05ef4193b2ded9dd9c73dd3f6a` (unchanged)
- BitcoinPIR commit currently vendored: see `vendor/SOURCE_COMMIT.txt` (now `48c6f88b`)
