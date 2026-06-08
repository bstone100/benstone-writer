# benstone.me — Architecture Decision Record

The architecture decisions embodied in this app, oldest first. One app across two repos: it began as **benstone-site** (Astro) and was rewritten into **benstone-writer** (Svelte + Cloudflare) — same project, new directory (ADR-0008). Each entry is a concrete technology / service / structural pattern that was actually chosen and built, with its real alternatives and an honest why, grounded in the dependency manifests, the Cloudflare bindings, and the git history of both repos — not in what we discussed. Requirements and principles are *context*, never entries. Append-only: a decision is never edited away, only superseded by a later entry.

`decided:` is honest about who actually decided — Ben set most *requirements*; Claude chose most *technology* and Ben waved it through:
- **Ben-set** — Ben specified the requirement this satisfies.
- **Ben-override** — Ben chose against Claude's recommendation.
- **Claude / waved through** — Claude decided; Ben didn't engage the tradeoff (often deliberately — see `working-with-claude.md`: waving-through is a test of Claude's judgment, not disengagement).

---

## ADR-0001 — Cloudflare as the platform
`in use` · decided: **Ben-set** the platform; Claude chose the services
**What.** The app has always run on Cloudflare — Pages for benstone-site, then a Worker + Durable Objects + D1 + R2 + KV for benstone-writer.
**Alternatives.** AWS / Azure (Ben: bad first-hand experiences), Vercel (Ben: distrusts the company), a classic VM / Hetzner (right for plain compute, wrong for edge reads + per-document realtime).
**Why.** Edge-served reads + zero-ops, and later per-document realtime coordination, all first-party. Ben is openly Cloudflare-biased (rates it the honest, cutting-edge cloud).

## ADR-0002 — Domain registered and served through Cloudflare
`in use` · decided: **Ben-set**
**What.** `benstone.me` via Cloudflare Registrar; apex + `www` attached to the deployment.
**Why.** Ben knew up front he'd deploy on Cloudflare, so registering there keeps DNS + edge cert + deploy in one place. The *name* is incidental; the decision is the single-vendor integration.
**Ben's call.** "I bought the domain through Cloudflare because I knew I wanted to deploy through Cloudflare and this would make that easier."

## ADR-0003 — Astro 6 + MDX as the site framework
`superseded by ADR-0008` · decided: **Claude / waved through**
**What.** benstone-site was Astro 6 with `@astrojs/mdx`; essays authored as MDX, static output. (`"Initial commit from Astro"`, 2026-05-26.)
**Alternatives.** A React SPA (Ben: "not lazy React slop"); Astro Starlight / a template (dropped once it outgrew one page).
**Why.** Content-first, writing-heavy site that must be fast and open-sourceable; static-first MDX with zero client JS fit. Superseded when the project pivoted from "AI writes my MDX" to "a tool Ben writes in" (ADR-0008).

## ADR-0004 — Cloudflare Pages as the host
`superseded by ADR-0008` · decided: **Claude / waved through**
**What.** benstone-site deployed to Cloudflare Pages (`wrangler pages deploy dist --project-name=benstone-site`). (`deploy.yml`.)
**Alternatives.** Cloudflare Workers (where benstone-writer ended up); other static hosts.
**Why.** Pages is the natural static-site target on Cloudflare. Superseded by the Worker deployment in the rewrite (ADR-0029).

## ADR-0005 — Three-repo content split (site + private content submodule + air-gapped brand)
`superseded by ADR-0008` · decided: **Ben-override**
**What.** Public site repo mounts a **private** `benstone-content` git submodule at `src/content`; sensitive brand/positioning lived in a separate air-gapped `benstone-brand`. CI checks out the submodule with a fine-grained `CONTENT_REPO_TOKEN`. (`.gitmodules`; `Move content to a private submodule; wire CI for it`, 2026-06-02.)
**Alternatives.** A single repo (Ben: drafts shouldn't be public); copy-on-publish into the public repo (Ben: that still mixes prose into the code repo — rejected); a headless CMS (rejected: content in a vendor DB, not files).
**Why.** Keep the *code* public (portfolio) but the *drafting history* private — privacy boundary = repo boundary. Ben overruled Claude's copy-on-publish proposal for the submodule. Superseded when benstone-writer moved content into the app's own data layer (no submodule).

## ADR-0006 — Tag-gated CI/CD: deploy only on a `v*` tag
`in use` · decided: **Ben-override**
**What.** CI builds on every push/PR; deploy fires **only** when a `v*` semver tag is pushed. Originated in benstone-site (`deploy.yml` on `tags: v*`), carried into benstone-writer. (`structural: … tag-driven release`, 2026-06-02.)
**Alternatives.** Push-to-main auto-deploy + PR previews (Claude's recommendation).
**Why.** Ben overruled the auto-deploy rec: deploy should be a deliberate, gated, semver-versioned act — "the human-centric convenience argument is moot since you do all the work anyway." Pushing ships nothing; only a tag deploys.

## ADR-0007 — Public open-source repo → security posture
`in use` · decided: **Ben-set**
**What.** The repo is public (both benstone-site and benstone-writer on `bstone100`), which sets the rules: no security-through-obscurity, no bypass routes, secrets only in `wrangler secret` (only non-secret Cloudflare IDs committed), gitleaks in CI.
**Why.** The engineering is the portfolio, so the code is public — meaning an attacker can read the whole attack surface and point an LLM at it, so security rests entirely on secrets.

## ADR-0008 — Rewrite from Astro to SvelteKit (Svelte 5) on Cloudflare Workers, in a new repo
`in use` · supersedes ADR-0003, ADR-0004, ADR-0005 · decided: **Ben-set** the pivot; Claude proposed the rewrite + Svelte, Ben said "sure"
**What.** The project was rebuilt as **benstone-writer** — a SvelteKit (Svelte 5 runes) app on Cloudflare Workers via `@sveltejs/adapter-cloudflare` — in a new directory/repo, leaving the Astro site behind.
**Alternatives.** Keep Astro and bolt on interactivity (couldn't meet the new requirements); React (rejected outright); Solid / Qwik (rejected: JSX).
**Why.** Ben pivoted the product from "AI writes my essays as MDX" to "build a writing tool I actually use" — which needs an editor, real-time sync, versioning, and motion that a static Astro site can't serve, plus his hard "no React" constraint. Svelte's compiler makes best practices structural and gives fine-grained reactivity. Claude suggested doing it as a clean new repo rather than converting in place; Ben agreed.

## ADR-0009 — Vite pinned to 7, not 8
`in use` · decided: **Claude / forced by debugging**
**What.** `vite@^7` (+ `vite-plugin-wasm` for the Automerge WASM); Vite 8 only for vitest.
**Alternatives.** Vite 8 (rolldown), the current major.
**Why.** Vite 8's rolldown emits a `createRequire(import.meta.url)` CJS shim workerd can't evaluate — proven by isolating a vanilla adapter build that crashed identically. Vite 7 (Rollup) has no such shim.

## ADR-0010 — Local-first (CRDT) as the sync paradigm; Automerge as the substrate
`in use` · decided: **Claude-framed (and unexamined); Ben trust-picked the substrate**
**What.** The sync model was built local-first — the browser's Automerge CRDT is the source of truth, the server a sync peer. `@automerge/automerge` + `automerge-repo` + the IndexedDB adapter. (`feat(data)`, benstone-writer.)
**The choice as presented.** "Which local-first CRDT — Automerge or Jazz?" (Yjs / Zero / ElectricSQL surveyed and dropped.) Both options were local-first; the real alternative — a **cloud-authoritative server, no CRDT** — was never on the table.
**What actually happened.** Claude framed it as a CRDT-library pick; Ben chose Automerge, but this was **trust in the frame, not an architecture decision** — he didn't know the field and was relying on Claude to frame a legitimate choice. The frame was wrong: *local-first itself* was the load-bearing call and was never deliberately made; it rode in unexamined with the CRDT framing (Automerge comes from the group that coined "local-first"). It produced per-device drafts and a dishonest cross-device save state, and is the layer now under active reconsideration (cloud-authoritative).

## ADR-0011 — cborg as the wire codec, both ends
`in use` · decided: **Claude / forced by runtime**
**What.** `cborg` encodes/decodes sync frames on client and server.
**Alternatives.** `cbor-x` (automerge-repo's default).
**Why.** cbor-x calls `new Function()` → `EvalError` in workerd; cborg is pure. Same codec both ends guarantees wire interop.

## ADR-0012 — Custom browser WebSocket adapter (not the stock one)
`in use` · decided: **Claude / waved through**
**What.** A ~140-line hand-written `NetworkAdapter` for the sync client.
**Alternatives.** automerge-repo's stock `WebSocketClientAdapter`.
**Why.** The stock adapter drags in slim Automerge variants that fight the WASM/Vite build; a small custom adapter drops the dependency and keeps the bundler stable.

## ADR-0013 — Durable Object per document as a *relay* + R2 storage
`in use` · decided: **Claude / build-discovered**
**What.** One `SyncDocDO` per document forwards sync frames between peers (a relay), with an R2 storage adapter for durable Automerge blobs. (`feat(sync)`, benstone-writer.)
**Alternatives.** A single authoritative server-`Repo` hub.
**Why.** A hub Repo never broadcasts cross-peer, and a hibernated DO only knows the peer that woke it — so a stateless relay is what survives hibernation and delivers realtime. (The cloud-authoritative reconsideration keeps the per-doc DO but flips it from relay to authority.)

## ADR-0014 — Raw ProseMirror (+ Automerge binding), not Tiptap
`in use` · decided: **Claude / waved through** (flagged, not asked)
**What.** Raw ProseMirror bound via `@automerge/prosemirror`, with hand-rolled plugins (input rules, keymap, selection bubble, slash menu) and `@floating-ui/dom` for overlays. (`feat(editor): commit to raw ProseMirror`.)
**Alternatives.** Tiptap v3 (headless, on ProseMirror).
**Why.** The Automerge binding owns the schema; Tiptap would fight it and bundle editor chrome the invisible-editor requirement doesn't want.

## ADR-0015 — Data stores: D1 = index, R2 = doc blobs, KV = reserved
`in use` · decided: **Claude / waved through**
**What.** D1 holds the published-post index + version log (relational); R2 holds Automerge document chunks (blobs); KV is bound but reserved.
**Alternatives.** All-D1, all-R2, Durable-Object storage as the primary store.
**Why.** Relational queries (publish index, monotonic version counter) want SQL; opaque CRDT chunks want a blob store.

## ADR-0016 — Publish = static HTML via DOMSerializer; zero-JS SSR reader
`in use` · decided: **Claude / waved through**
**What.** Publishing renders the Automerge body to static HTML with ProseMirror's `DOMSerializer` over the editor's *own* schema; the public reader SSRs that HTML and ships zero editor/CRDT JS (a `@bw/ui/reader` subpath enforces the boundary). (`feat(publish)`.)
**Alternatives.** A second, reader-specific renderer.
**Why.** One renderer means a published essay reads exactly as written, and readers never download the editor or Automerge.

## ADR-0017 — SSE for live reader updates (ReaderFeedDO)
`in use` · decided: **Ben-set** the no-reload requirement; Claude built the mechanism
**What.** `ReaderFeedDO` fans out publish/unpublish events over Server-Sent Events; open reader pages update in place. (`feat(reader-feed)`.)
**Alternatives.** Reload / poll (rejected by Ben); a WebSocket JSON-RPC of our own (rejected as too general).
**Why.** Ben's standing rule: an app never makes the user reload or wait for a poll. SSE is the minimal push that fits a read-only reader.

## ADR-0018 — Define-once typed RPC over a framework
`in use` · decided: **Claude / waved through**
**What.** Imperative server verbs go through one `/api/rpc/[verb]` door; the contract is defined once with `zod` in `@bw/schema`, zod-parsed at ingress, types inferred on both ends. (`feat(rpc)`.)
**Alternatives.** An RPC framework (oRPC / tRPC); a hand-rolled WebSocket JSON-RPC.
**Why.** The imperative surface is tiny (~2 verbs — almost everything is local CRDT edits), so a framework is over-machinery and a hand-rolled protocol is the known trap.

## ADR-0019 — Auth: Arctic + jose GitHub-OAuth gate (replaced Cloudflare Access)
`in use` · decided: Cloudflare Access was **Ben-override** (then reversed); Arctic+jose was Claude's original rec, adopted on the reversal
**What.** GitHub OAuth via `arctic`, a `jose` HS256 `__Host-` session cookie, gating on Ben's immutable numeric GitHub id. (`feat(auth): GitHub OAuth …, replacing Cloudflare Access`.)
**Alternatives.** Cloudflare Access (built first, then ditched — Ben hated the product), Auth.js (workerd bug), better-auth (CVE; heavy), hand-rolled OAuth (rejected on a public repo).
**Why.** On a public repo the security surface should be minimal and vetted: delegate the handshake to Arctic and the crypto to jose. Ben first overrode Claude's GitHub-OAuth rec to pick Access for its zero-owned-code edge gate, then reversed when the Access *product* proved unbearable — landing back on Claude's original pick.

## ADR-0020 — pnpm monorepo with a hard package boundary
`in use` · decided: **Claude / waved through**
**What.** `packages/{schema,data,ui}` + `apps/web` + `workers/api`; `@bw/api` is a Durable-Object *library* the app re-exports, so Automerge never enters `apps/web/src`.
**Alternatives.** A single flat app; relocating the sync code into the app.
**Why.** Package boundaries can be lint-enforced (one data door, one design system), and keeping Automerge in a library package means the feature-boundary lint needs no escape hatch.

## ADR-0021 — Structural enforcement layer (lint + typed props), not convention
`in use` · decided: **Ben-set** the demand; Claude built the mechanism
**What.** ESLint import-boundaries (one data door; no `<style>` in features), Stylelint token-only values, and a component library whose props are token-keyed union types — so a raw color/px/font value is a *type error*.
**Alternatives.** Convention + code review.
**Why.** Ben's core principle is *structure beats behavior*: make the bad shape impossible to write rather than rely on discipline. (Using a component library is table stakes; the decision is enforcing it in the type system and linter.)

## ADR-0022 — Path-addressed data layer (@bw/data façade)
`in use` · decided: **Ben-set**
**What.** Components receive a Unix-style path (identity, never the data) and self-subscribe to that entity through the `@bw/data` façade; no prop-drilling. The import-boundary lint forbids reaching past the façade.
**Alternatives.** Passing store objects down through props.
**Why.** Ben specified this data model (path = address, components grab-and-subscribe, à la Firebase RTDB `ref(path).on()`); it makes components self-contained and is the seam the boundary lint guards.

## ADR-0023 — Path-derived View Transitions
`in use` · decided: **Ben-set** the "motion is structural" requirement; Claude built the mechanism
**What.** Navigation uses the native View Transitions API, and the transition *kind* (descend / ascend / lateral / shared-element) is computed from the (from-path, to-path) relationship — declared once, never authored per screen. (`feat(motion)`.)
**Alternatives.** A motion library bolted on; rendering UI to canvas/WebGL (rejected — loses text, a11y, SEO).
**Why.** Ben wanted motion to be a core architectural concern (à la Core Animation) that *teaches the data model*; deriving the transition from the path relationship makes meaning-bearing motion fall out of the structure.

## ADR-0024 — Version model v1: branchable Automerge history
`superseded by ADR-0025` · decided: **Ben-set** the UX; Claude built it on Automerge
**What.** Auto-captured versions; "continue from here" forked a new Automerge doc seeded from a past view (Patchwork pattern), original untouched. (`feat(history)`.)
**Why.** Ben wanted Google-Docs version UX with git-like branching and zero ceremony. Superseded once the dev-style branch/fork model proved wrong for a writer.

## ADR-0025 — Version model v2: linear log, HEAD/LIVE, server-side vN
`in use` · supersedes ADR-0024 · decided: **Ben-set**
**What.** One linear append-only version log with two pointers — HEAD (editing tip) and LIVE (publish pointer); *restore* is a forward `change()` writing the old content (roll-forward, never `changeAt()`/fork); permanent monotonic vN release numbers assigned server-side in D1. (`feat(version)`.)
**Alternatives.** The branching model of ADR-0024 (killed); storing vN in the CRDT (a CRDT can't produce a strict monotonic counter, so it lives in D1).
**Why.** Ben tore into the branch model as a developer's mental model imposed on a writer's tool, and specified HEAD-vs-LIVE instead — strictly less code, unmistakable about "what I edit" vs "what the world sees."

## ADR-0026 — One surface: owner-aware index, no separate studio
`in use` · decided: **Ben-set**
**What.** `/` is an owner-aware index; `/documents/{uuid}` is read-mode for visitors and edit-in-place for the owner. No `/studio`. (`feat(surface): collapse to ONE surface`.)
**Alternatives.** A separate `/studio` editor plane + duplicate public/private list pages.
**Why.** Ben wanted to write and edit inline with the public site; read and edit are two views of one entity, so two UI surfaces was a DRY violation.

## ADR-0027 — Identity is the document UUID; the path is the URL; no slugs
`in use` · decided: **Ben-set**
**What.** A document's UUID is its only identity, and `/documents/{uuid}` *is* its URL — one canonical address, no slug table or title-derived slugs.
**Alternatives.** Editable title-derived slugs (Claude proposed; Ben overruled).
**Why.** Identity must be stable and unique; an editable title can't be an id, and a slug would give every essay two addresses. (Human-readable URLs explicitly deferred.)

## ADR-0028 — "Saved" means durable in the cloud
`in use` · decided: **Ben-set**
**What.** The save indicator (Saving / Saved / Offline) reports cloud durability — "Saved" only after the DO acknowledges an R2 persist matching what's on screen — never a local-only write. (`feat(sync): honest cloud-save status`.)
**Alternatives.** Reflect the synchronous local Automerge write (instant, but a lie about durability).
**Why.** Ben's #1 value is honesty: the indicator must mean "safe to close the tab," like Google's "Saved to Drive." (Its current implementation rides on the local-first sync of ADR-0010.)

## ADR-0029 — Deploy as one Cloudflare Worker (app + DOs merged at build)
`in use` · decided: **Claude / waved through**
**What.** The SvelteKit app and both Durable Object classes ship as a single Worker; a build step grafts the DO exports onto adapter-cloudflare's `_worker.js`. One config, one migration list. (`feat(deploy): one-Worker unification`.)
**Alternatives.** Split: a SvelteKit Worker + a separate DO Worker wired by a service binding.
**Why.** One origin, one deploy, one set of migrations; the WebSocket upgrade stays same-origin. The split's only real advantage (isolating Automerge's bundle) is already achieved inside one Worker via esbuild-separate bundling.
