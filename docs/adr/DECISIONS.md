# benstone.me — Architecture Decision Record

Append-only log of the app's architecture decisions, oldest first. The codebase is the source of truth for *what* exists; this log is the source of truth for *why*, written in the voice of the moment each decision was made. One app across two repos: benstone-site (Astro), then benstone-writer (Svelte + Cloudflare) — same project, new directory (ADR-0008).

**Rules.** Immutable — an entry is never edited or deleted; a later decision supersedes an earlier one by a **new** entry that names it (the old entry is left as written). Each entry records: when **decided** (conversation) and **implemented** (commit); the decision and its real *why*; and who decided — `Ben`, `Ben (overrode Claude)`, `Claude, Ben approved`, or `Claude, Ben waved through`. A wave-through means Ben trusted Claude's framing without weighing it, often deliberately to test Claude's judgment (see `working-with-claude.md` §11–12) — **historical only**: going forward every architectural decision is an explicit Ben call after Claude explains it in plain English, so there are no more waved-through decisions.

*Entries before 2026-06-08 were backfilled from git + transcript; their decided-dates are approximate. Entries after are recorded live, at decision time.*

---

## ADR-0001 — Build the app on Cloudflare
**Decided** 2026-05-26 · **Implemented** 2026-05-26 onward · **Ben**
Ben decided the app would run on Cloudflare, full stop — he's a committed Cloudflare user (rates it the honest, cutting-edge cloud; bad experiences with AWS/Azure; distrusts Vercel). The specific services that followed (Pages, then Workers, Durable Objects, D1, R2, KV) were Claude's choices Ben waved through, recorded separately where they matter.

## ADR-0002 — Register the domain through Cloudflare
**Decided** 2026-05-26 · **Implemented** 2026-05-26 · **Ben**
Ben: "I bought the domain through Cloudflare because I knew I wanted to deploy through Cloudflare and this would make that easier." benstone.me via Cloudflare Registrar; the single-vendor integration (DNS + cert + deploy in one place) is the decision — the name is incidental.

## ADR-0003 — Astro 6 + MDX for the site
**Decided** 2026-05-26 · **Implemented** 2026-05-26 (`"Initial commit from Astro"`) · **Claude, Ben waved through**
I built benstone-site on Astro 6 with MDX — a static-first framework where content is files and pages ship no JS by default, fitting a fast, writing-heavy, open-source site. Ben's only basis for waving it through: he'd used Astro once at work and the site it produced felt snappy, which he liked.

## ADR-0004 — Deploy to Cloudflare Pages
**Decided** 2026-05-26 · **Implemented** 2026-05-26 (`deploy.yml`) · **Claude, Ben waved through**
I deployed benstone-site to Cloudflare Pages (Cloudflare's static-site host). Ben waved it through on the basis of prior good experience with Pages.

## ADR-0005 — Deploy only on a version tag (semver)
**Decided** 2026-05-27 · **Implemented** 2026-06-02 (`structural: … tag-driven release`) · **Ben (overrode Claude)**
I recommended push-to-main auto-deploy for a low-stakes personal site. Ben overrode me: deploy fires only on a pushed `v*` semver tag; pushes/PRs only build and verify. His basis was prior experience — he already knew semver is the correct discipline and anything looser is a mistake. Carried into benstone-writer.

## ADR-0006 — Public open-source repo
**Decided** 2026-05-27 · **Implemented** 2026-05-27 · **Ben**
Ben decided the repo is public — the engineering itself is the portfolio. The security posture follows and isn't separately optional: an attacker can read the whole codebase, so no security-through-obscurity, no bypass routes, secrets only in `wrangler secret`, secret-scanning in CI.

## ADR-0007 — Keep drafts private via a content submodule
**Decided** 2026-06-02 · **Implemented** 2026-06-02 (`Move content to a private submodule`) · **Ben (overrode Claude)**
I first proposed copy-on-publish (copy a finished essay into the public repo). Ben overruled it — that still puts the prose in the code repo — and decided content lives in a separate **private** repo mounted as a git submodule, so the privacy boundary is the repo boundary. (Sensitive brand notes went in a third, air-gapped repo.)

## ADR-0008 — Pivot to a writing tool; rewrite in SvelteKit on Cloudflare Workers (new repo)
**Decided** 2026-06-04/05 · **Implemented** 2026-06-05 (`build: scaffold … SvelteKit app`) · **Ben set the pivot; Claude proposed the stack + new repo, Ben approved** · Supersedes ADR-0003, ADR-0004, ADR-0007
Ben decided AI-written essays would never be his voice, and pivoted the product: instead of a site Claude writes MDX into, build a *writing tool Ben uses himself*. That needs an editor, real-time sync, versioning, and motion a static Astro site can't provide, plus Ben's hard "no React" constraint. I proposed rebuilding as a SvelteKit (Svelte 5) app on Cloudflare Workers in a clean new repo (benstone-writer) rather than converting Astro in place; Ben said sure. (Svelte was my pick under his no-React constraint, waved through.)

## ADR-0009 — Build local-first; Automerge as the sync engine
**Decided** 2026-06-05 · **Implemented** 2026-06-05/06 (`feat(data)`, `feat(sync)`) · **Claude, Ben waved through**
I am building the editor *local-first*: the browser holds the document as a CRDT (a structure that merges concurrent edits without conflicts) and syncs to the server in the background. Ben described *behavior* — write on Mac/continue on phone, autosave, instant reader updates, Google-Docs-grade offline, "don't hand-roll websockets" — and I mapped that to the "local-first / sync-engine" category, researched the field, and picked Automerge over Jazz for its branchable history. Ben said "Automerge sounds right," approving the substrate without weighing the paradigm.

## ADR-0010 — ProseMirror as the editor engine
**Decided** 2026-06-05 · **Implemented** 2026-06-05 (`feat(editor): commit to raw ProseMirror`) · **Claude, Ben waved through**
I chose ProseMirror (a low-level rich-text editor toolkit), used raw rather than via a wrapper like Tiptap, because the Automerge↔ProseMirror binding owns the document schema. Ben had never heard of ProseMirror and didn't investigate it; he waved it through, trusting my pick.

## ADR-0011 — cborg as the sync wire codec
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`docs(§8.1)`) · **Claude, Ben waved through**
I encode sync messages with cborg on both client and server instead of automerge-repo's default cbor-x, because cbor-x calls `new Function()`, which throws in Cloudflare's runtime. Implementation detail, waved through.

## ADR-0012 — Custom WebSocket sync adapter
**Decided** 2026-06-06 · **Implemented** 2026-06-06 · **Claude, Ben waved through**
I hand-wrote the ~140-line browser WebSocket adapter instead of automerge-repo's stock one, which pulled in an Automerge variant that fought the build. Waved through.

## ADR-0013 — Durable Object per document, as a relay
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(sync)`) · **Claude, Ben waved through**
The server side is one Durable Object (a single-instance stateful Cloudflare Worker) per document, acting as a relay that forwards edits between connected devices, backed by R2 for storage. I discovered during the build that a central server-copy neither broadcasts nor survives the DO sleeping, so a relay was required. Ben doesn't know Durable Objects well; waved through.

## ADR-0014 — D1 + R2 + KV for storage
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(deploy)` real bindings) · **Claude, Ben waved through (against his bias)**
I chose D1 (Cloudflare's SQL database) for the published-post index and version log, R2 (blob storage) for the document chunks, KV reserved. Ben waved it through but flagged the bias afterward: he dislikes SQL/tables for general storage (his experience: it always gets nasty unless the data is genuinely for analytical queries) and would default to JSON files. He withheld that bias to see my framing — so D1/SQL may be the wrong tool here by his lights. (R2/KV he was comfortable with from work.)

## ADR-0015 — SSR + static-HTML publishing; zero-JS reader
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(publish)`) · **Claude, Ben waved through (against his bias)**
I render a published essay to static HTML (from the editor's own schema) and serve the public reader server-side (SSR) with no editor/CRDT JS. Ben leans SPA and is biased against SSR but waved it through to give SSR a fair shot — and he likes the result (instant page loads, the site feels fast), so no regret.

## ADR-0016 — SSE for live reader updates
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(reader-feed)`) · **Claude, Ben waved through**
I push live updates to open reader pages with Server-Sent Events (a one-way server→browser stream). Ben *required* that readers never reload or poll, but this *mechanism* was mine: he'd normally reach for a WebSocket and had never used SSE — he waved it through out of curiosity, not wanting to bias me toward websockets.

## ADR-0017 — Hand-rolled typed RPC instead of an RPC framework
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(rpc)`) · **Claude, Ben waved through (and thinks it's wrong)**
I put the ~2 imperative server verbs behind a small hand-written typed contract (one endpoint, zod-validated) instead of adopting an RPC framework, arguing a framework was over-machinery for two verbs. Ben waved it through to see what I'd do — but his experience says you should *always* use a real RPC framework (e.g. Connect/protobuf) and that anything less devolves a codebase into madness. He considers this a likely mistake driven by my not wanting to add the framework.

## ADR-0018 — Auth attempt 1: SimpleWebAuthn passkeys
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (partial, uncommitted) · **Claude, Ben waved through**
I started building auth as passkeys via SimpleWebAuthn. Ben waved it through because I'd mentioned it would let him use Face ID / Touch ID, which sounded cool. As I coded it, it began to look like hand-rolled auth.

## ADR-0019 — Auth attempt 2: Ben stops passkeys, picks Cloudflare Access
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(auth): Cloudflare Access`) · **Ben (stopped Claude; chose from a presented pair)** · Supersedes ADR-0018
Ben stopped me when the passkey code smelled like hand-rolled auth, and we reevaluated. I presented a choice between GitHub OAuth and Cloudflare Access; Ben chose Cloudflare Access to give it a fair shot — though from work he already knew Access is an enterprise tool for gating employees to internal infra, not auth for a public site (which is why its DX is so bad). He didn't reach for Clerk (which he knows works) because he wanted to try something new.

## ADR-0020 — Auth attempt 3: GitHub OAuth (Arctic + jose)
**Decided** 2026-06-07 · **Implemented** 2026-06-07 (`feat(auth): GitHub OAuth …`) · **Ben (changed his mind); implementation waved through** · Supersedes ADR-0019
Partway through setting up Cloudflare Access in its UI, Ben re-confirmed how bad it is and changed his mind: use GitHub OAuth instead. I implemented it with Arctic (the OAuth handshake) + jose (a signed session cookie), gating on his GitHub id; Ben waved the implementation details through. (Ben still doesn't think Access is the right tool here; in hindsight a full-permission Cloudflare API token could have let Claude configure Access without Ben touching its UI.)

## ADR-0021 — pnpm monorepo
**Decided** 2026-06-05/06 · **Implemented** 2026-06-06 · **Claude, Ben waved through (against his bias)**
I structured the code as a pnpm monorepo (schema / data / ui packages + the app + the sync worker). Ben's bias is that polyrepo is smarter, but he waved this through to give monorepo a fair shot; he won't know whether he regrets it until he reviews the code.

## ADR-0022 — Studio/writing route split with slug URLs
**Decided** 2026-06-05/06 · **Implemented** early benstone-writer · **Claude, Ben waved through (a contradiction Claude failed to surface)**
I designed the app with separate route trees — `/writing` + `/writing/{slug}` for the public reader and `/studio` + `/studio/{uuid}` for editing — and title-derived slug URLs. This contradicted Ben's vision of editing essays *inline* on the public site, but it was buried among heavy technical detail in a long architecture document that Ben waved through as a whole, trusting I'd catch and surface the contradiction. I didn't — I built it in as the foundation.

## ADR-0023 — Structural UI-enforcement layer (lint + typed props)
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`build(lint)`, `feat(ui)`) · **Claude, Ben waved through (cynically)**
Ben was stating a *principle* — UI must be consistent, with one component library actually used, not custom CSS everywhere. I turned that into a mechanism: ESLint/Stylelint rules + token-keyed prop types meant to make off-system UI a type error. Ben waved it through while expecting it to fail — in his repeated experience I never actually build *and use* a component library and the code devolves into a mess. (He hasn't yet code-reviewed whether it held this time.)

## ADR-0024 — Path-addressed data layer (@bw/data)
**Decided** 2026-06-05 · **Implemented** 2026-06-05 (`feat(data)`) · **Claude, Ben waved through (cynically)**
Ben was conveying a *principle* — address app data by a path and have components subscribe to it, never prop-drill domain objects. I invented the concrete mechanism (a `@bw/data` façade; Ben has no idea what that means and has never used Firebase, the analogy I reached for). Ben waved it through expecting me not to follow through and to devolve into prop-drilling anyway, from prior experience.

## ADR-0025 — Motion via path-derived View Transitions
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(motion)`) · **Claude, Ben waved through (cynically)**
Ben was conveying a *principle* of how structural animation should work; the actual decision he made was to use Svelte. I built motion on the browser's View Transitions API with the transition derived from the navigation path. Ben tried for several rounds to get me to embed animation structurally, gave up, and waved this through knowing from experience I can't animate a 2D app properly — and it failed.

## ADR-0026 — Ship as a single Cloudflare Worker
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(deploy): one-Worker unification`) · **Claude, Ben waved through**
I merged the SvelteKit app and the Durable Objects into one deployed Worker at build time. Ben isn't familiar enough with Svelte, SSR, or Durable Objects to weigh it; waved through.

## ADR-0027 — Collapse to one surface (kill /studio)
**Decided** 2026-06-07 · **Implemented** 2026-06-07 (`feat(surface): collapse to ONE surface`) · **Ben** · Supersedes ADR-0022
Ben corrected the route split: there is one surface, not two — `/` is the index, and a document lives at one route that visitors read and the owner edits in place. Inline editing was always his vision; the separate `/studio` was my contradiction, now removed.

## ADR-0028 — Identity is the UUID; the path is the URL; no slugs
**Decided** 2026-06-07 · **Implemented** 2026-06-07 · **Ben** · Supersedes ADR-0022
Ben told me explicitly to stop using title slugs: a data element is identified by a UUID and addressed by a unix-style path, always — an editable title can't be a stable id. `/documents/{uuid}` is the only address.

## ADR-0029 — Version model v1: branchable history
**Decided** 2026-06-06 · **Implemented** 2026-06-06 (`feat(history)`) · **Claude, off Ben's offhand word, waved through**
Ben used the word "branch" while describing version history; I ran with it and built a branching model (each branch a forked Automerge document). Ben waved through the decisions that followed. He later judged this his own mistake for suggesting the word without first checking how Google Docs actually works.

## ADR-0030 — Version model v2: linear log, HEAD/LIVE
**Decided** 2026-06-07 · **Implemented** 2026-06-07 (`feat(version)`) · **Ben** · Supersedes ADR-0029
Ben killed branching: he tested Google Docs, found it has no branching and a cleaner model, and decided on one linear append-only history with two pointers — HEAD (what you're editing) and LIVE (what's published) — plus permanent version numbers. Less code, and the right mental model for a writer.
