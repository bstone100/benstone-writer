# benstone.me — Architecture Decision Record

The concrete architecture decisions embodied in the codebase: the technologies, services, and structural patterns that were actually chosen and built — and the alternatives they beat. Grounded in the dependency manifests, the Cloudflare bindings, and the 66-commit history, **not** in what we talked about. Requirements and principles ("be real-time," "stay DRY") are *context* here, never entries — the entry is the concrete mechanism chosen to satisfy them. Plans not yet built are not decisions and live at the bottom under *Pending*.

**Honest attribution.** Ben set most of the *requirements* (the product shape); Claude made most of the *technology* choices and Ben waved them through. `decided:` reads honestly:
- **Ben-set** — Ben specified the requirement this satisfies.
- **Ben-override** — Ben chose against Claude's recommendation.
- **Claude / waved through** — Claude decided; Ben didn't engage with the tradeoff.

**Framing vs picking.** When Claude presented a shortlist, the *framing* — which options were even on the table, and the paradigm beneath them — was usually the real decision, and that was Claude's; the human's pick within it was trust, not agency. The most dangerous decisions are the ones framed *implicitly*: a whole paradigm smuggled in as the unquestioned substrate of a smaller choice that *was* surfaced (see ADR-0006 — "local-first" was never decided, it rode in with the CRDT). So where a "choice" was trapped inside a frame Ben couldn't evaluate, the entry says so, rather than crediting him with a decision he didn't really make.

**Lineage.** benstone-writer is a Svelte+Cloudflare rebuild of an abandoned Astro predecessor (benstone-site); this record covers the current system. The data/sync layer marked ⚠ is slated for reversal by the in-progress cloud-authoritative rewrite (see *Pending*).

---

## ADR-0001 — Cloudflare as the entire platform
`in use` · decided: **Ben-set** the platform; Claude chose the services
**What.** Everything is Cloudflare: one Worker (the app), two Durable Objects (`SyncDocDO` per-document sync, `ReaderFeedDO` reader feed), D1, R2, KV; `nodejs_compat`.
**Alternatives.** AWS / Azure (Ben: bad first-hand experiences), Vercel (Ben: distrusts the company), a classic VM / Hetzner (right for plain long-running compute, wrong for edge-served reads + per-document realtime).
**Why.** Edge-served reads + per-document realtime coordination + zero-ops, all first-party. Ben is openly Cloudflare-biased (rates it the honest, cutting-edge cloud); the Durable-Object fit for realtime is genuine, not just preference.

## ADR-0002 — Domain registered and served through Cloudflare
`in use` · decided: **Ben-set**
**What.** `benstone.me` registered via Cloudflare Registrar; apex + `www` attached to the Worker as Custom Domains (declared in `wrangler.jsonc`).
**Alternatives.** Any registrar + a dangling DNS record / external CDN.
**Why.** Ben knew up front he'd deploy on Cloudflare, so registering there means DNS + edge cert + deploy all live in one place and the deploy token can manage the records. (The *name* is incidental; the architecture decision is the single-vendor integration.)
**Ben's call.** "I bought the domain through Cloudflare because I knew I wanted to deploy through Cloudflare and this would make that easier."

## ADR-0003 — One Cloudflare Worker (app + DOs), merged at build time
`in use` · decided: **Claude / waved through**
**What.** The SvelteKit app and both Durable Object classes ship as a single Worker; a build step grafts the DO exports onto adapter-cloudflare's `_worker.js`. One config, one migration list. (`feat(deploy): one-Worker unification`, 2026-06-06.)
**Alternatives.** Split: a SvelteKit Worker + a separate DO Worker wired by a service binding.
**Why.** One origin, one deploy, one set of migrations; the WebSocket upgrade stays same-origin. The split's only real advantage (isolating Automerge's bundle) is already achieved inside one Worker via esbuild-separate bundling.

## ADR-0004 — SvelteKit + Svelte 5 (runes) as the framework
`in use` · decided: **Ben-set** the "no React" constraint; framework converged by research, Ben waved the pick through
**What.** SvelteKit (Svelte 5 runes) via `@sveltejs/adapter-cloudflare`.
**Alternatives.** React (rejected by Ben outright), Solid / Qwik (rejected: JSX, the thing Ben dislikes), Vue.
**Why.** Ben's hard constraint was no React (makes bad code/perf easy; JSX god-files; whole-page re-renders). Svelte's compiler makes best practices structural, gives fine-grained no-re-render reactivity, separates script/markup/style by construction, and has a first-party Cloudflare adapter.

## ADR-0005 — Vite pinned to 7, not 8
`in use` · decided: **Claude / forced by debugging**
**What.** `vite@^7.3.5` (+ `vite-plugin-wasm` for the Automerge WASM). Vite 8 is held back to vitest only.
**Alternatives.** Vite 8 (rolldown) — the current major.
**Why.** Vite 8's rolldown emits a `createRequire(import.meta.url)` CJS-interop shim that workerd cannot evaluate; proven by isolating a vanilla adapter build that crashed identically. Vite 7 (Rollup) has no such shim.

## ADR-0006 — Local-first (CRDT) as the sync paradigm; Automerge as the substrate ⚠
`⚠ being reversed` · decided: **Claude-framed (and unexamined); Ben trust-picked the substrate**
**What.** The entire sync model was built local-first — the browser's Automerge CRDT is the source of truth, the server a sync peer. Substrate: `@automerge/automerge` + `automerge-repo` + the IndexedDB adapter. (`feat(data)`, 2026-06-05.)
**The choice as presented.** "Which local-first CRDT — Automerge or Jazz?" (Yjs / Zero / ElectricSQL etc. surveyed and dropped earlier.) Both options were local-first; the real alternative — a **cloud-authoritative server, no CRDT** — was never put on the table.
**What actually happened (the honest version).** Claude framed the decision as a CRDT-library pick and offered two; Ben chose Automerge — but this was **trust in the frame, not an architecture decision**. He didn't know the options or the field and was relying on Claude to have framed a legitimate choice. The frame was wrong: *local-first itself* was the load-bearing call, and it was never deliberately made — it rode in unexamined with the CRDT framing (Automerge comes from the group that coined "local-first"). A false frame means every option inside it is wrong, which is why the whole layer is being torn out (see *Pending*). This is the record's clearest example of the framing-vs-picking trap.

## ADR-0007 — cborg as the wire codec, both ends
`in use` · decided: **Claude / forced by runtime**
**What.** `cborg` encodes/decodes sync frames on both client and server.
**Alternatives.** `cbor-x` (automerge-repo's default codec).
**Why.** cbor-x calls `new Function()`, which throws `EvalError` in workerd; cborg is pure. Using it on both ends guarantees wire interop.

## ADR-0008 — Custom browser WebSocket adapter (not the stock one)
`⚠ slated for reversal` · decided: **Claude / waved through**
**What.** A ~140-line hand-written `NetworkAdapter` for the browser sync client.
**Alternatives.** automerge-repo's stock `WebSocketClientAdapter`.
**Why.** The stock adapter drags in slim Automerge variants that fight the WASM/Vite build; a small custom adapter drops the dependency and keeps the bundler stable.

## ADR-0009 — Durable Object per document as a *relay* + R2 storage ⚠
`⚠ slated for reversal` · decided: **Claude / build-discovered**
**What.** One `SyncDocDO` per document forwards sync frames between peers (a relay), with an R2 storage adapter for durable Automerge blobs. (`feat(sync)` + `docs(§8.1)`, 2026-06-06.)
**Alternatives.** A single authoritative server-`Repo` hub.
**Why.** A hub Repo never broadcasts cross-peer, and a hibernated DO only knows the peer that woke it — so a stateless relay is what actually survives hibernation and delivers realtime. (The cloud rewrite keeps the per-doc-DO shape but flips it from relay to authority.)

## ADR-0010 — Raw ProseMirror (+ Automerge binding), not Tiptap
`in use` · decided: **Claude / waved through** (flagged, not asked)
**What.** The editor is raw ProseMirror bound via `@automerge/prosemirror`, with hand-rolled plugins (input rules, keymap, selection bubble, slash menu) and `@floating-ui/dom` for overlays. (`feat(editor): commit to raw ProseMirror`, 2026-06-05.)
**Alternatives.** Tiptap v3 (headless, on ProseMirror).
**Why.** The Automerge binding owns the schema; Tiptap would fight it and bundle editor chrome that the "invisible editor" requirement doesn't want.

## ADR-0011 — Data stores: D1 = index, R2 = doc blobs, KV = reserved
`in use` · decided: **Claude / waved through**
**What.** D1 holds the published-post index + version log (relational); R2 holds Automerge document chunks (blobs); KV is bound but reserved.
**Alternatives.** All-D1, all-R2, Durable-Object storage as the primary store.
**Why.** Relational queries (publish index, monotonic version counter) want SQL; opaque CRDT chunks want a blob store. Each binding does the job it's shaped for.

## ADR-0012 — Publish = static HTML via DOMSerializer; zero-JS SSR reader
`in use` · decided: **Claude / waved through**
**What.** Publishing renders the Automerge body to static HTML with ProseMirror's `DOMSerializer` over the editor's *own* schema; the public reader SSRs that HTML and ships zero editor/CRDT JS (a `@bw/ui/reader` subpath enforces the boundary). (`feat(publish)`, 2026-06-06.)
**Alternatives.** A second, reader-specific renderer.
**Why.** One renderer means a published essay reads exactly as written, and readers never download the editor or Automerge.

## ADR-0013 — SSE for live reader updates (ReaderFeedDO)
`in use` · decided: **Ben-set** the no-reload requirement; Claude built the mechanism
**What.** `ReaderFeedDO` fans out publish/unpublish events over Server-Sent Events; open reader pages update in place. (`feat(reader-feed)`, 2026-06-06.)
**Alternatives.** Reload / poll (rejected by Ben), a WebSocket JSON-RPC of our own (rejected as too general).
**Why.** Ben's standing rule is that an app never makes the user reload or wait for a poll; SSE is the minimal push that fits a read-only reader.

## ADR-0014 — Define-once typed RPC over a framework
`in use` · decided: **Claude / waved through**
**What.** Imperative server verbs go through one `/api/rpc/[verb]` door; the contract is defined once with `zod` in `@bw/schema`, zod-parsed at ingress, types inferred on both ends. (`feat(rpc)`, 2026-06-06.)
**Alternatives.** An RPC framework (oRPC / tRPC); a hand-rolled WebSocket JSON-RPC.
**Why.** The imperative surface is tiny (~2 verbs — almost everything is local CRDT edits), so a framework is over-machinery and a hand-rolled protocol is the known trap; a thin define-once contract gives the same end-to-end typing with zero deps.

## ADR-0015 — Auth: Arctic + jose GitHub-OAuth gate (replaced Cloudflare Access)
`in use` · decided: Cloudflare Access was **Ben-override** (then reversed); Arctic+jose was Claude's original rec, adopted on reversal
**What.** GitHub OAuth via `arctic`, a `jose` HS256 `__Host-` session cookie, gating on Ben's immutable numeric GitHub id. (`feat(auth): GitHub OAuth …, replacing Cloudflare Access`, 2026-06-07.)
**Alternatives.** Cloudflare Access (built first, then ditched — Ben hated the product), Auth.js (open workerd bug), better-auth (account-takeover CVE; heavy), hand-rolled OAuth (rejected — sharp edges on a public repo).
**Why.** On a public repo the security surface should be minimal and vetted: delegate the handshake to Arctic and the crypto to jose; own ~3 security-critical lines. Ben first overrode Claude's GitHub-OAuth recommendation to pick Access for its zero-owned-code edge gate, then reversed when the Access *product* proved unbearable — landing back on Claude's original pick.

## ADR-0016 — pnpm monorepo with a hard package boundary
`in use` · decided: **Claude / waved through**
**What.** `packages/{schema,data,ui}` + `apps/web` + `workers/api`; `@bw/api` is a Durable-Object *library* the app re-exports, so Automerge never enters `apps/web/src`.
**Alternatives.** A single flat app; relocating the sync code into the app.
**Why.** Package boundaries can be lint-enforced (one data door, one design system), and keeping Automerge in a library package means the feature-boundary lint needs no escape hatch.

## ADR-0017 — Structural enforcement layer (lint + typed props), not convention
`in use` · decided: **Ben-set** the demand; Claude built the mechanism
**What.** ESLint import-boundaries (one data door; no `<style>` in features), Stylelint token-only values, and a component library whose props are token-keyed union types — so a raw color/px/font value is a *type error*. (`build(lint)` + `feat(ui)` + `feat(lint)`, 2026-06-06.)
**Alternatives.** Convention + code review ("remember to be consistent").
**Why.** Ben's core principle is *structure beats behavior*: make the bad shape impossible to write rather than rely on discipline. (Using a component library at all is table stakes; the *decision* is enforcing it in the type system and the linter.)

## ADR-0018 — Path-addressed data layer (@bw/data façade)
`in use` · decided: **Ben-set**
**What.** Components receive a Unix-style path (identity, never the data) and self-subscribe to that entity's changes through the `@bw/data` façade; no prop-drilling of domain objects. The import-boundary lint forbids reaching past the façade.
**Alternatives.** Passing store objects down through props.
**Why.** Ben specified this data model (path = address, components grab-and-subscribe, à la Firebase RTDB `ref(path).on()`); it makes components self-contained and placeable anywhere, and it's the seam the boundary lint guards.

## ADR-0019 — Path-derived View Transitions
`in use` · decided: **Ben-set** the "motion is structural" requirement; Claude built the mechanism
**What.** Navigation uses the native View Transitions API, and the transition *kind* (descend / ascend / lateral / shared-element) is computed from the (from-path, to-path) relationship — declared once, never authored per screen. (`feat(motion)`, 2026-06-06.)
**Alternatives.** A motion library bolted on after the fact; rendering the UI to a canvas/WebGL scene graph (rejected — loses text, a11y, SEO a writing site can't lose).
**Why.** Ben wanted motion to be a core architectural concern (à la Core Animation) that *teaches the data model*; deriving the transition from the path relationship makes meaning-bearing motion fall out of the structure instead of being hand-authored and policed.

## ADR-0020 — Version model v1: branchable Automerge history
`superseded by ADR-0021` · decided: **Ben-set** the UX; Claude built it on Automerge
**What.** Auto-captured versions; "continue from here" forked a new Automerge doc seeded from a past view (the Patchwork pattern), original untouched. (`feat(history)`, 2026-06-06.)
**Why.** Ben wanted Google-Docs version UX with git-like branching and zero ceremony. **Superseded** once the dev-style branch/fork model proved wrong for a writer.

## ADR-0021 — Version model v2: linear log, HEAD/LIVE, server-side vN
`in use` · decided: **Ben-set**
**What.** One linear append-only version log with two pointers — HEAD (editing tip) and LIVE (publish pointer); *restore* is a forward `change()` writing the old content (roll-forward, never `changeAt()`/fork); permanent monotonic vN release numbers are assigned server-side in D1. (`feat(version)`, 2026-06-07.)
**Alternatives.** The branching model of ADR-0020 (killed); storing vN inside the CRDT (a CRDT can't produce a strict monotonic counter, so the number lives in D1).
**Why.** Ben tore into the branch model as a developer's mental model imposed on a writer's tool, and specified HEAD-vs-LIVE instead — strictly less code and unmistakable about "what I edit" vs "what the world sees."

## ADR-0022 — One surface: owner-aware index, no separate studio
`in use` · decided: **Ben-set**
**What.** `/` is an owner-aware index; `/documents/{uuid}` is read-mode for visitors and edit-in-place for the owner. There is no `/studio`. (`feat(surface): collapse to ONE surface`, 2026-06-07.)
**Alternatives.** Round one's separate `/studio` editor plane + duplicate public/private list pages.
**Why.** Ben wanted to write and edit inline with the public site; read and edit are two views of one entity, so two UI surfaces was a DRY violation. (Public vs private is now a plumbing distinction, not a UI one.)

## ADR-0023 — Identity is the document UUID; the path is the URL; no slugs
`in use` · decided: **Ben-set**
**What.** A document's UUID is its only identity, and `/documents/{uuid}` *is* its URL — one canonical address, internal == public, no slug table or title-derived slugs.
**Alternatives.** Editable title-derived slugs (Claude proposed; Ben overruled).
**Why.** Identity must be stable and unique; an editable title can't be an id, and a slug would give every essay two addresses. (Human-readable URLs are explicitly deferred.)

## ADR-0024 — "Saved" means durable in the cloud ⚠
`⚠ implementation slated for reversal` · decided: **Ben-set**
**What.** The save indicator (Saving / Saved / Offline) reports cloud durability — "Saved" only after the DO acknowledges an R2 persist whose heads match what's on screen — never a local-only write. (`feat(sync): honest cloud-save status`, 2026-06-07.)
**Alternatives.** Reflect the synchronous local Automerge write (instant, but a lie about durability).
**Why.** Ben's #1 value is honesty: the indicator must mean "safe to close the tab," like Google's "Saved to Drive." (The current implementation is coupled to the local-first sync being replaced; the *requirement* survives the rewrite, the mechanism changes.)

## ADR-0025 — Tag-gated CI/CD; full gate on every push
`in use` · decided: **Ben-override**
**What.** Every push runs lint + svelte-check + vitest + build + gitleaks; a deploy fires *only* when a `v*` semver tag is pushed. (`ci: tag-gated deploy pipeline`, 2026-06-07.)
**Alternatives.** Push-to-main auto-deploy + PR previews (Claude's recommendation).
**Why.** Ben overruled the auto-deploy rec: deploy should be a deliberate, gated, semver-versioned act — "the human-centric convenience argument is moot since you do all the work anyway, so do it correctly." Pushing commits ships nothing; only a tag deploys.

## ADR-0026 — Public open-source repo → security posture
`in use` · decided: **Ben-set**
**What.** The whole repo is public, which sets the security rules: no security-through-obscurity, no test/dev bypass routes, secrets only in `wrangler secret` (only non-secret Cloudflare IDs are committed), gitleaks in CI.
**Alternatives.** A private repo (looser posture).
**Why.** The engineering is the portfolio, so the code is public — which means an attacker can read the entire attack surface and point an LLM at it, so security must rest entirely on secrets.

---

## Pending — decided in discussion, not yet built (not ADRs until implemented)

These are the current direction, captured so a fresh session isn't blind — but they are **not** decisions in this record until they ship, at which point they supersede the ⚠ entries above.

- **Cloud-authoritative rewrite.** Reverse local-first/browser-as-truth → the Durable Object is the document's live authority; clients pull authoritative state before rendering; the save indicator reflects the authority's ack. (Supersedes ADR-0006, -0008, -0009, and the implementation of -0024.) The in-DO sync engine (Yjs on DOs / PartyKit vs authoritative `prosemirror-collab` step-rebasing) is an open fork.
- **Server-authoritative `documents` catalog in D1** (retire the browser-local Automerge registry), so drafts exist across devices and a purge cron has something to scan.
- **Lifecycle**: take-down (tombstone) + delete-to-trash with a 30-day purge.
- **Process**: this ADR + code as truth, replacing living/round architecture docs.

_Open questions about Ben's intent that the record can't answer are in `QUESTIONS-FOR-BEN.md`._
