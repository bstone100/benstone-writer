# benstone-writer — Architecture

> A local-first writing & publishing platform that becomes **benstone.me**.
> **Status: v0.1 working draft.** This document is the spec we refine until it can be
> implemented completely and correctly in a single pass. Open questions are marked **⚠️**
> inline and collected in §17. Nothing here is sacred — challenge any choice.

---

## 0. Naming & scope

- **Working name:** `benstone-writer` (placeholder — rename freely). It **replaces** the current Astro `benstone-site`; we keep the Astro site live and cut `benstone.me` over only at the end.
- **Scope (locked — this is the line against scope creep):**
  - Single-author writing tool (just Ben) + a public reader site.
  - **Text only.** No image/video pipeline yet (deliberately deferred).
  - **No** social cards / share buttons / SEO-virality features.
  - Auth = one user, passkey only.
  - In scope and non-negotiable: local-first editing, offline, cross-device sync, automatic version history with branching, real-time push of published posts to readers, native-iOS-grade motion, 120fps, passwordless biometric auth.

---

## 1. System overview — two planes

The system is cleanly split into two planes that must **not** be conflated (conflating them is the trap that makes you reach for one heavy tool for two different problems):

- **Authoring plane** — *private, single-user, local-first, read-write.* The editor, the local Automerge documents, sync to the cloud, branching/history, auth. Heavy CRDT machinery lives here. Latency-critical for *Ben*.
- **Reading plane** — *public, many readers, read-only, fast, live-updating.* Published posts, served static-fast and pushed live on publish. No CRDT, no editor JS. Latency-critical for *readers* (first paint) but the data is immutable and trivial.

```
      AUTHORING  (private, local-first)            READING  (public, read-only)
      ─────────────────────────────────            ────────────────────────────

      ┌──────────────────────────┐                 ┌──────────────────────────┐
      │ Ben's browser            │                 │ Reader's browser         │
      │   Tiptap / ProseMirror   │                 │   Published post         │
      │   editor                 │                 │   (SSR HTML, no editor   │
      │   automerge-repo +       │                 │   JS)                    │
      │   IndexedDB (local truth)│                 │                          │
      └────────────┬─────────────┘                 └───┬──────────────────┬───┘
                   │                                   │ GET / SSR        ▲ SSE
        WebSocket  │  Automerge sync  ⇅                ▼  (HTTP)          │ "published"
                   │                                   │                  │
 ══════════════════╪═══════════════ CLOUDFLARE ════════╪══════════════════╪═════════════
                   │                                   │                  │
      ┌────────────▼─────────────┐   ┌─────────────────▼┐  ┌──────────────┴───────────┐
      │ SyncDocDO                │   │ SvelteKit Worker │  │ ReaderFeedDO             │
      │ (Durable Object)         │   │  SSR · app shell │  │ (Durable Object)         │
      │ live doc + WebSocket hub │   │  · API · auth ·  │  │ SSE fan-out to readers   │
      │                          │   │  publish RPC     │  └──────────────────────────┘
      └────────────┬─────────────┘   └────────┬─────────┘            ▲
                   │ persist / load           │ read + write          │ notify on publish
                   ▼                          ▼                       │
      STORAGE  (Cloudflare bindings)                                  │
        R2  — Automerge change/snapshot blobs   (your writing, durable)
        D1  — doc/branch registry · published index · passkey credential ──┘
        KV  — WebAuthn challenges · sessions
```

---

## 2. The guiding principle, made concrete

Ben's spec: *best practices should be inherent, not disciplined into existence.* How each layer honors it:

- **Local-first (Automerge):** the network is **never** in the critical path of a keystroke — local store is the source of truth, sync is background. Offline, autosave, and cross-device are *the default behavior*, not features we wire.
- **Schema = contract:** the Automerge document schema is the client/server data contract; we never hand-roll a WebSocket JSON-RPC protocol.
- **Svelte compiler = inversion of control:** the right reactive code is the path of least resistance.
- **CRDT change-DAG = versioning for free:** every keystroke is in history; branching is a library primitive, not git ceremony.
- **Cloudflare = global by default:** distribution is inherent, not something we engineer.

---

## 3. Languages

| Language | Where | Notes |
|---|---|---|
| **TypeScript** | Everything we write — client + Workers + DOs | One language end-to-end. |
| **Rust → WASM** | Transitive, not hand-written | Automerge's core is Rust compiled to WASM; runs in the browser **and** in Workers. We consume it via the JS packages. |
| **SQL** | D1 schema/queries | SQLite dialect. |

---

## 4. Frameworks & libraries — full bill of materials

| Package | Role | Runs in | Why this |
|---|---|---|---|
| **SvelteKit** (Svelte 5 runes) | App framework: public SSR + authoring SPA shell + server endpoints | Worker + browser | Fine-grained signals (no re-render-the-world), SFC separation of concerns (no JSX god-files), compiler-as-IoC, motion as a **language primitive**, first-party Cloudflare adapter. |
| **`@sveltejs/adapter-cloudflare`** | Build/deploy target | Build | Officially recommended path; emits one `_worker.js` (routing+SSR+assets) with D1/KV/R2/DO bindings. |
| **Tiptap v3** (headless) on **ProseMirror** | The editor | browser | Best long-form typing stability; truly framework-agnostic (no React); zero chrome by default → the "invisible editor"; **Static Renderer** for the public site (no editor JS shipped to readers). |
| **`@automerge/automerge`** | CRDT document + history/branching | browser + DO (WASM) | Git-like change-DAG → automatic per-keystroke history + `fork`/`merge`/`view` branching with zero ceremony. |
| **`@automerge/automerge-repo`** | Document sync/storage orchestration | browser + DO | Storage + network **adapters** → local-first now, add a network adapter for sync later with no rework. |
| **`@automerge/prosemirror`** | Binds editor ↔ Automerge doc | browser | The editor edits the CRDT directly (single `Automerge` doc as source of truth). Vanilla, no React. |
| **`@simplewebauthn/server`** + **`/browser`** | Passkeys (Face/Touch ID) | Worker + browser | ESM, Workers-native; handles all the dangerous WebAuthn crypto. |
| **Hono** | Worker-side router for API/auth/sync endpoints | Worker | Clean Workers ergonomics; middleware for the one-gate auth guard. |
| **Bits UI** (on **Melt UI**) + **design tokens (CSS custom properties)** | Component library / design system | browser | Headless + token-driven → style written **once**, consistent UI, no scattered CSS. |
| **Svelte motion** (`svelte/motion` `Spring`/`Tween`, `transition:`, `animate:flip`) + **View Transitions API** + **CSS scroll-driven animations** + **`motion`** (vanilla core) | Motion-as-architecture | browser | Layered; all compositor-driven (transform/opacity); see §12. |
| **`oRPC`** (or tRPC v11) | Thin typed RPC for imperative side-effects only | Worker + browser | The few non-data calls (publish, etc.). The Automerge schema covers all *replicated data*; this covers verbs. ⚠️ oRPC vs tRPC vs Hono-RPC is a minor open choice. |
| **Zod** | Schema validation (RPC inputs, Automerge doc shape, D1 row types) | shared | Single source of truth for types at the edges. |
| **Wrangler** + **Miniflare/`vitest`** | Local dev, build, deploy, test | dev | Local emulation of D1/KV/R2/DO. |

---

## 5. Cloud services — full list (all Cloudflare)

| Service | Role | Why this, not the alternative |
|---|---|---|
| **Workers** (via SvelteKit adapter) | Host the app: public SSR, authoring shell, API/auth/RPC endpoints | The compute layer; global by default. |
| **Durable Objects** | (a) **Sync coordinator** — authoritative Automerge peer + WebSocket hub, one per document-family; (b) **Reader-feed** — SSE fan-out of publish events | This is the *correct* DO use, not "DO boom": genuine stateful per-entity coordination (one doc = one consistency domain) + socket fan-out + an in-memory live object. ⚠️ sharding granularity — see §17. |
| **R2** | **Durable storage of Automerge document binaries** (change log + periodic snapshots) | Blob-shaped (Automerge is binary), cheap, **no egress fees**, "documents are files." Not D1 because the payload is opaque binary, not relational. |
| **D1** (SQLite) | Relational **metadata**: document & branch registry, "which branch is live", published-post index + rendered HTML, the passkey credential | Queryable structured data the app reasons over. Not R2 because we query/join it. |
| **KV** | Ephemeral: WebAuthn challenges (5-min TTL), optionally sessions | Native TTL, edge-readable across POPs between auth round-trips. |
| **Cache / CDN** (built into Workers) | Serve public read plane fast & globally | Published HTML is immutable until republished → highly cacheable. |
| **Workers Cron Triggers** | Periodic Automerge history **compaction** in R2 | Bounds storage growth (snapshot + trim). ⚠️ cadence/strategy — see §17. |

---

## 6. Data storage — *where your work is saved* (the named gap, answered)

Your writing lives in **three places at once**, by design; losing any one is recoverable from the others.

| Tier | Where | What's stored | Role |
|---|---|---|---|
| **Tier 0 — device** | Browser **IndexedDB** (automerge-repo `IndexedDBStorageAdapter`) | Full local copy of your Automerge docs (incl. history) | **Local source of truth.** Instant reads/writes; full offline. This is why typing never waits on the network. |
| **Tier 1 — live coordination** | **Sync Durable Object** (in-memory + DO storage) | The live Automerge doc(s) for any currently-open document-family | Authoritative merge point + WebSocket hub that syncs your devices to each other in real time. |
| **Tier 2 — durable cloud** | **R2** | Automerge **change/snapshot binaries**, keyed by document id | The canonical, durable, backed-up copy of all your writing + its entire branching history. |
| **Metadata** | **D1** | Document registry, **branch registry** (`{id, docFamilyId, name, baseHeads, parentBranchId, status, createdAt}`), `liveBranchId` pointer per doc, published-post index + rendered HTML, passkey credential | The structured index the app queries. |
| **Ephemeral** | **KV** | WebAuthn challenges, sessions | Short-TTL only. |

**What an Automerge "document" actually is in storage:** the append-only **change DAG** (content-hashed changes referencing parents — git's model) persisted as binary in R2. History and branches are inherent to this structure; a "branch" is its own document handle in the registry that shares ancestor changes (the Patchwork/Upwelling pattern). Nothing is ever deleted → abandoned drafts are preserved for free.

**The write path, concretely:** keystroke → local Automerge change (instant, IndexedDB) → automerge-repo ships the change over WebSocket to the Sync DO → DO merges, persists the change to R2, updates D1 metadata, and broadcasts to your other connected devices. Offline: changes queue in IndexedDB; on reconnect automerge-repo syncs them (CRDT merge, no conflicts for a single author).

---

## 7. Microservices — topology, deployment, communication

On Cloudflare the "services" are **Workers + Durable Objects + bound storage**. We keep them *logically* separated but avoid over-fragmenting into needless separate deployments (that's the inverse trap). **Packaging recommendation:** a **single SvelteKit Worker** hosts the app + API + auth + RPC; the two **Durable Object classes** (`SyncDocDO`, `ReaderFeedDO`) ship in the same Worker project and are reached via bindings. (⚠️ A separate sync Worker is an option if isolation is wanted — §17.)

| # | Service | Deployment unit | Responsibilities | Talks to / protocol |
|---|---|---|---|---|
| 1 | **Web app** | SvelteKit Worker | Public SSR of published posts; serve authoring SPA shell (private routes); host API/RPC/auth endpoints | Browser (HTTP/SSR); D1 (read published); Auth; RPC → Publish |
| 2 | **Auth** | Hono routes in the Worker | Passkey register/login ceremonies; issue/verify session cookie; guard private routes; authorize the DO WS upgrade | D1 (credential), KV (challenge/session); browser (HTTP) |
| 3 | **Sync coordinator** | `SyncDocDO` (Durable Object), 1 per document-family | Accept authenticated WS (automerge-repo sync protocol); hold live doc; merge changes; persist to R2; update D1; broadcast to peers | Browser (**WebSocket**); R2 + D1 (bindings) |
| 4 | **Publish** | Worker endpoint (typed RPC) | On "publish": load live branch from Sync DO/R2, render Automerge→ProseMirror JSON→**static HTML** (Tiptap Static Renderer), write to D1 + cache, notify reader-feed | Authoring client (**RPC**); Sync DO/R2 (read); D1 + Cache (write); Reader-feed (notify) |
| 5 | **Reader-feed** | `ReaderFeedDO` (Durable Object) | Hold open reader **SSE** streams; on publish event, push "post published/updated" to all readers | Readers (**SSE**, one-way); Publish (internal call/WS) |
| 6 | **Compaction** | Worker **Cron** | Periodically snapshot + trim Automerge history in R2 | R2 + D1 (bindings) |

### Communication summary
- **Browser ↔ Sync DO:** WebSocket, speaking Automerge's sync protocol (binary). Authenticated at upgrade.
- **Browser (reader) ↔ Reader-feed DO:** **SSE** (Server-Sent Events), one-way push. *Why SSE, not WebSocket:* reader updates are strictly one-directional (server → reader), immutable, and low-frequency; SSE is simpler, auto-reconnects natively, needs no custom message protocol, is cheaper to fan out, and runs natively on Workers via the Streams API. WebSocket here would be using a bidirectional, stateful, heavier tool for a one-way broadcast — the exact "too-general-a-tool" trap. (Authoring genuinely needs WS — bidirectional sync — so it uses WS. Right tool per plane.)
- **Browser ↔ Worker:** HTTP for SSR/asset/auth; **typed RPC (oRPC/tRPC)** for imperative verbs (publish, create-branch-side-effects, etc.).
- **Worker/DO ↔ storage:** Cloudflare **bindings** (not network calls) to R2, D1, KV.
- **Intra-edge (Publish → Reader-feed DO):** DO stub binding / internal fetch.

### Writing sequence
```
  Browser           automerge-repo        SyncDocDO          R2 + D1
  (editor)          (+ IndexedDB)         (Durable Object)   (storage)
     │                    │                    │                 │
     │ keystroke →        │                    │                 │
     │ Automerge change   │                    │                 │
     ├───────────────────▶│                    │                 │
     │                    │ persist locally    │                 │
     │                    │ (instant, offline) │                 │
     │                    │                    │                 │
     │                    │  sync change ── WebSocket ──▶         │
     │                    ├───────────────────▶│                 │
     │                    │                    │ merge into doc  │
     │                    │                    ├────────────────▶│ persist change
     │                    │                    │                 │ + update heads
     │                    │ broadcast to your  │                 │
     │                    │ other devices      │                 │
     │                    │◀───────────────────┤                 │
     ▼                    ▼                    ▼                 ▼
```

### Reading sequence
```
  Reader            SvelteKit Worker      D1               ReaderFeedDO
  browser           (SSR + publish)                        (SSE hub)
     │                    │                 │                   │
     │ GET /writing/slug  │                 │                   │
     ├───────────────────▶│                 │                   │
     │                    │ read published  │                   │
     │                    ├────────────────▶│                   │
     │ SSR page (no editor JS)              │                   │
     │◀───────────────────┤                 │                   │
     │ open SSE stream  ───────────────────────────────────────▶│
     │                    │                 │                   │
     :  … later, Ben hits "publish" (authenticated RPC) …       │
     │                    │ render + write  │                   │
     │                    ├────────────────▶│ published HTML    │
     │                    │ notify "published: slug"            │
     │                    ├────────────────────────────────────▶│
     │ SSE event → page swaps in new post live (no refresh)     │
     │◀─────────────────────────────────────────────────────────┤
     ▼                    ▼                 ▼                   ▼
```

---

## 8. Authoring data flow (detail)

- **Client:** an `automerge-repo` `Repo` with `IndexedDBStorageAdapter` (Tier 0, local source of truth) + the **stock `WebSocketClientAdapter`** from `@automerge/automerge-repo-network-websocket` (runs in the browser unchanged), pointed at `wss://<app>/sync/{documentId}`.
- Editor binds to the doc's text via `@automerge/prosemirror` — Tiptap transactions become Automerge changes and back.
- **Offline:** automerge-repo works against IndexedDB; reconnect replays buffered changes; CRDT merge converges (single author → per-field last-writer-wins, which is correct).
- **Versioning / branching:** the change DAG is the history, and **each branch is its own Automerge document** (its own `documentId` / DO / R2 prefix); the fork relationship lives **relationally in D1** (`branches.parent_document_id`, `branches.fork_at_heads`, `liveBranchId`). "Continue from here" = `clone(view(doc, oldHeads))` → new branch document + registry row → repoint `liveBranchId`; the old branch persists untouched (nothing deleted). This makes compaction per-branch and **fork-point corruption structurally impossible** — we never `removeDoc` an ancestor referenced by a live branch (all deletes gated on the registry). History UI groups changes into edit-sessions (store fine, display coarse).

### 8.1 — Sync wiring: Automerge ↔ Cloudflare (resolved — was §17.1)
The one genuinely-open piece, now specified. **No turnkey package exists; the reference to follow is [`substrate-system/mergeparty`](https://github.com/substrate-system/mergeparty)** — a real `Repo` running inside a Durable Object where the DO object implements *both* the storage and network adapters. The official `WebSocketServerAdapter` is Node/`ws`-only and won't run in Workers, so we port mergeparty's hand-rolled sync protocol onto raw DO handlers. Concretely:

- **`SyncDocDO` — one Durable Object per document** (`idFromName(documentId)`; confirmed correct for a single author — independent hibernation, bounded memory, isolation; mirrors the proven "one room per document"). On first message it builds an in-memory `Repo({ storage: R2StorageAdapter, network: <hibernatable-WS adapter>, sharePolicy: () => true, peerId: 'server:'+docId })`.
- **Hibernatable WebSockets:** `ctx.acceptWebSocket(ws, [peerId])`; handle `webSocketMessage`/`webSocketClose`; `setWebSocketAutoResponse('ping','pong')` so heartbeats don't wake the object (or bill). The DO hibernates between sync bursts; on wake the **`Repo` is a rebuildable cache over R2** — lazily `repo.find(documentId)` reloads from storage. (The one sharp edge: never assume in-memory doc state survives hibernation; test a full hibernate→wake→sync cycle.)
- **`R2StorageAdapter`** (we build it — ~5 methods over the **native R2 binding**, not the S3 SDK), using automerge-repo's own content-addressed key layout (dedupe is automatic):
  - `{documentId}/snapshot/{headsHash}`
  - `{documentId}/incremental/{sha256(change)}`
  - `{documentId}/sync-state/{storageId}`
- **Compaction is built into automerge-repo** (it snapshots + deletes superseded chunks once incrementals outgrow the snapshot, losslessly) — **no Cron needed for correctness**; an optional Workers Cron only warm-snapshots idle docs + sweeps R2 orphans.
- **Auth at the upgrade:** validate the session **cookie** in `fetch()` *before* `acceptWebSocket()` (browsers can't set WS headers; the cookie rides the upgrade), then `serializeAttachment` the identity so it survives hibernation.
- **Runtime gotchas (confirmed, mandatory):** use **`cborg`** for CBOR (`cbor-x` breaks in the Workers runtime) and shim `globalThis.performance ??= { now: () => Date.now() }` for the Automerge WASM.
- **Honest scope:** the DO sync server + the R2 adapter are **ours to build and test** (~one focused session), with mergeparty as a near-exact blueprint. WASM cold-start on a cold DO is the only perf watch-item.

---

## 9. Reading data flow (detail)

- Published content is **pre-rendered to static HTML** at publish time (Tiptap Static Renderer over the doc's ProseMirror JSON) and stored in D1 (+ edge cache). Readers get SSR HTML, **zero editor/CRDT JS**, instant paint, fully cacheable.
- Each reader page opens an **SSE** stream to `ReaderFeedDO`. On publish, the feed pushes an event; the Svelte page reactively swaps in the new/updated post **with no reload** (the non-negotiable live-reader requirement). ⚠️ event-only-then-refetch vs push-the-content-in-the-event — §17.

---

## 10. Editor (detail)

- **Tiptap v3 headless**, paragraph-first schema → the screen is just text on a calm, centered measure (iA Writer/Bear feel). **No markdown input**, **no persistent toolbar**.
- Light structure (heading/quote/list) via a **slash menu** and a **selection bubble** — `/` is a trigger, never syntax that lands in the text. Markdown input rules **off** by default.
- **Focus mode** (dim non-active paragraph/sentence) and **typewriter scrolling** as opt-in ProseMirror decorations; off by default.
- Source of truth is the **Automerge doc**, not ProseMirror JSON; `@automerge/prosemirror` keeps them bound. Public render derives ProseMirror JSON → static HTML.

---

## 11. Client & UI architecture — your principles enforced *structurally*

> These are invariants, not style preferences. The architecture is built so the wrong shape is **impossible or the path of most resistance** — never something to "remember." For each principle below, the doc names **the mechanism that enforces it**, because a principle the build can't enforce is just a wish.

### 11.0 — How anything is made structural here
Three mechanisms, reused throughout:
- **(A) One allowed door** — a single API for data, a single source for style, a single definition for every wire message, and *no second way in*.
- **(B) Package + lint boundaries** — the build forbids the illegal import or shape, so a violation **fails CI**, not code review.
- **(C) Framework grain** — Svelte's compiler and Automerge's reactivity make the right thing the least code.

Every "enforced by" tag below is one of these.

### 11.1 — App data is a path-addressed filesystem. No exceptions.
- One normalized reactive tree; every entity has a **canonical absolute path**: `documents/{id}`, `documents/{id}/title`, `documents/{id}/branches/{bid}`, `published/{slug}`, `settings/editor`, … A path names exactly one entity; fields are sub-paths.
- The **only** data API any component may touch:
  - `read(path)` → reactive accessor (value + auto-subscribe + auto-unsubscribe on unmount)
  - `collection(query)` → reactive `{ ids, order }` for a list/query
  - `mutate(path, recipe)` → the only write; transactional/batched
- **Paths are typed, not strings:** a schema-generated builder — `P.document(id).title` — yields a typed path, so a wrong path is a *compile error*. (From `schema/`, §14.)
- **Enforced by (A)+(B):** `read/collection/mutate` are the *only* data exports, from the `data/` package; a lint boundary forbids feature/UI code from importing `automerge-repo`, the sync layer, or any store directly. There is no legal way to get data except by path; reaching around it fails CI.

### 11.2 — Components fetch their own data by path and subscribe. Props carry identity, never data.
- A component that needs data is handed the **path**, not the data; inside, `read(path)` gives it the value *and* the subscription. It is self-contained and mountable anywhere in the tree.
- **Prop-drilling is barred by construction:** props may carry **paths/ids + presentational config** (`variant`, `size`) — **never a domain-data object**. Passing a fetched entity down through props is the forbidden shape.
- **Enforced by (A)+(B):** `read()` hands back a *reactive accessor*, not a plain object, so there's nothing convenient to drill; a lint rule flags any prop typed as a domain entity (you pass `path: DocPath`, never `doc: Document`). A relocated component keeps working because it owns its own subscription — the whole point.

### 11.3 — One component library + design system. Style is written exactly once.
- A single `ui/` package = **design tokens** (CSS custom properties — the *only* place raw color/space/type/motion values live) + **headless primitives** (Melt/Bits) + a small **styled set** (`Button`, `TextField`, `Stack`, `Prose`, …). Features **compose** these; features do not write CSS.
- **Enforced by (B):** `ui/` is the *only* package permitted to contain CSS/`<style>` — a feature package that ships CSS fails lint; **stylelint** forbids literal color/px/font values anywhere (only `var(--token)`), so even `ui/` derives from tokens. One token file = one source of truth → consistent brand, and a token change restyles everything. Scattered custom CSS is **unmergeable**.

### 11.4 — Inversion of control · separation of concerns · event-based · real-time = perception
- **IoC:** exactly one way to get data, one to style, one to message the server — so the best-practice path is the *only* path. The architecture *is* the inversion; you don't conform it to best practices, it has no other shape. (Svelte's compiler is the same idea at the language level.)
- **SoC / no god-files:** Svelte SFCs split script/markup/style by construction; the packages split **data** (`data/`), **style** (`ui/`), **features** (compose), **domain logic** (pure fns over the store). No file can mix concerns because the boundaries forbid it.
- **Event-based, never polling:** the data layer is subscription-only (Automerge change events → fine-grained signals); reader push is SSE; sync is WebSocket. **There is no polling primitive in `data/`** — nothing to poll with. (Your one allowed exception — sub-perceptual-rate sampling for a render/clock loop — lives only in the motion layer, never in data.)
- **Real-time = user perception:** the UI reads/writes only the **local** store (the path API over the local Automerge doc) and **never awaits a network round-trip to render or accept input.** The network is background sync, full stop. Structural, because the data API is local by construction — "await fetch, then show" is not an available shape, so the user never waits.

### 11.5 — Inline editing: read and edit are two views of *one* entity
Your inline-edit requirement actually *tightens* the path principle rather than complicating it:
- **One article = one Automerge document** at `documents/{id}`. "Published" is state + a cached static render at `published/{slug}`. The reader render and the editor are **two views of the same path**, not two stores.
- **Reader (unauthed):** SSR static HTML from `published/{slug}`; zero editor JS.
- **You, on the same URL:** the page checks your session; if it's you, an **Edit** affordance exists. Pressing it lazy-loads the **editor island** (Tiptap + automerge-repo + sync WS) bound to **the same `documents/{id}`** and swaps the static render for the live editor *in place* — fix the typo, autosaved + versioned instantly.
- **Auth-gated structurally:** the editor bundle and the authenticated sync socket are only loaded behind the session check; an unauthed reader can neither fetch the editor chunk nor open the socket. The Edit affordance is gated server-side.
- **Re-publish:** inline edits land in the doc (autosaved, in history); pushing them to readers is the explicit **Publish** (re-render `published/{slug}`, notify the reader-feed). ⚠️ open UX call: for an already-live article, auto-republish small fixes, or require a Publish tap? (I lean: a one-tap "publish this fix," so readers never catch a half-finished edit.)

### 11.6 — Information architecture: pages, routes, layout
**Public reading plane** (SSR, edge-cached, zero editor JS):
- `/` — home: the identity line + recent writing (proof-forward).
- `/writing` — index of all published essays.
- `/writing/{slug}` — an essay. The inline **Edit** affordance appears here when you're authed (§11.5); the document's path *is* its URL, so there's no separate edit route.
- `/work`, `/about`, `/contact` — supporting pages (carried over / trimmed from the current site).

**Private studio** (client islands, auth-gated, never SSR'd, loaded only behind the session check):
- `/studio` — **library:** your documents, drafts + published — a `collection('documents/*')`.
- **History & branches** — the "continue from here" scrubber + branch picker (§8), as an overlay on the document.
- **Command palette (⌘K)** — global overlay: navigation + actions (new, publish, switch branch). Keyboard-first (the Linear feel).
- **Auth** — passkey/Face-ID unlock.

**Per-route split** (drives §9 + §14): public routes are SSR + edge-cached; studio surfaces are client islands; the editor bundle + sync socket never load for an unauthed reader.

**Global layout — one skeleton, everywhere:** a thin **header** (brand + nav; on `/writing/{slug}` it also carries the authed Edit/Publish controls), a single centered **prose measure** as the spine — *reading and writing share the exact same column*, which is what makes inline-edit feel like the page simply becoming editable — and transient **overlays** (command palette, history). Navigating between these surfaces is exactly where §12's path-derived motion lives.

### 11.7 — The project structure that makes the above enforceable (not aspirational)
```
benstone-writer/
  packages/
    schema/   <- the ONE source of truth: data shapes, RPC procs, SSE events, typed paths (§14)
    data/     <- the ONLY data API: read() / collection() / mutate()   (imports sync/, exposes paths)
    ui/       <- the ONLY place CSS lives: tokens + headless primitives + styled components
    sync/     <- automerge-repo + adapters; imported ONLY by data/
  apps/
    web/      <- SvelteKit; features compose ui/ + data/ + schema/   (no CSS, no direct data/sync access)
  workers/
    api/      <- Worker + DOs (SyncDocDO, ReaderFeedDO), auth, publish RPC; imports schema/
```
- **Lint-enforced import boundaries** (eslint `no-restricted-imports` / a boundaries plugin): `apps/web` may import `ui/`, `data/`, `schema/` — **never** `sync/`, `automerge-repo`, or raw CSS. Only `data/` imports `sync/`; only `ui/` contains CSS. **A violation fails CI.** That CI failure is what converts every principle above from "we agreed to it" into "the build won't let us not." (Source layout; deploys per §15 as one Worker + DOs.)

### 11.8 — Component inventory (what `ui/` must provide)
The fixed set the design system ships; *everything* composes these (style written once, §11.3), and **components are not invented ad hoc while coding** — that is exactly how inconsistency sneaks in:
- **Primitives:** `Button`, `IconButton`, `TextField`, `Link`, `Icon`, `Stack`/`Row`/`Grid` + `Spacer`/`Divider` (layout).
- **Surfaces / overlays:** `Card`, `Sheet`/`Drawer` (Vaul-style, gesture-driven), `Dialog`, `Popover`, `Tooltip`, `CommandPalette` (⌘K).
- **Content:** `Prose` (the shared reading/writing measure + typography), `PostListItem`, `Heading`, `Meta`.
- **App-specific:** `Editor` (Tiptap canvas), `SlashMenu`, `SelectionBubble`, `HistoryScrubber`, `BranchPicker`, `PublishControl`, `EditAffordance`.
- All on Melt/Bits headless behavior + tokens; each data-bound component keys its shared-element transition by its **path** (§12). The inventory is the contract: the design system is *real* only because the set is fixed up front, not discovered mid-build.

---

## 12. Motion architecture — animation that teaches the data model

Motion is not a layer bolted on; it is **how the user learns the shape of the data.** Every animation must encode a real relationship between entities — and because our data is path-addressed (§11.1), the right motion is **derived from the path relationship**, not hand-authored per screen. That is what makes meaningful animation *structural* (and keeps Ben out of the animation-policing seat).

**Semantic vocabulary — consistent app-wide, so the user learns it once:**
- **Lateral** (slide / scroll / carousel) = **siblings** — same path level (`documents/a` ↔ `documents/b`).
- **Depth transition** = **level change** — descend to a child / ascend to a parent. Scaling/zoom is *one* encoding (containment metaphor: the child comes out of the parent); the iOS **push** is another (navigation-stack metaphor: the child slides in and covers the parent, back reveals it). *Which* encoding is the app's vocabulary is a visual-iteration choice; the **semantics** — "this move is a level change" — is the invariant the architecture enforces.
- **Shared-element morph** = **identity & location** — the same entity, **keyed by its path**, animates between wherever it appears (library card → open document; reader → inline editor).

**Structural derivation (the "Core Animation, trivial to declare" part):**
- The transition layer takes `(fromPath, toPath)`, compares them, and picks the motion: same level → lateral; deeper → the *descend* transition (push-cover or zoom-in, per the chosen vocabulary); shallower → its inverse. Declared **once**, applied everywhere — a feature *navigates the data tree* and the correct transition follows.
- **Shared-element identity = the entity's path.** Every data-bound component sets its `view-transition-name` from its path, so the same datum morphs automatically between views. The path is the continuity key; no per-screen wiring.

**Implementation — the how, all compositor-driven (animate only `transform`/`opacity`/`filter`):**
- **Animatable values:** `svelte/motion` `Spring`/`Tween` — set `.target`, the value travels; interruptions handled by velocity (interpolation inherent to the value).
- **Enter / leave / reorder:** Svelte `transition:` / `animate:flip`.
- **State / route morphs:** the **View Transitions API** (same-document), keyed by path for shared elements; brief (≤300ms).
- **Gestures / scroll-linked:** `motion` vanilla core + CSS scroll-driven animations (off-main-thread).
- **Rejected:** decorative motion that encodes no relationship (noise); and canvas/WebGL retained-mode UI (throws away DOM a11y/text/SEO — the "scene graph" is the reactive component tree, whose values we animate).
- **Discipline:** 120fps = ~8.3ms budget; `will-change` only transiently; stop loops when idle/offscreen; measure ms/frame before & after each motion change.

---

## 13. Auth & security

- **Passkeys** via `@simplewebauthn/server` on the Worker; one credential (Face/Touch ID). `rpID` = eTLD+1, **pinned day one, never changed**.
- **Storage:** credential in D1; challenge in KV (5-min TTL); session = opaque id in KV (revocable) behind an **`__Host-` `HttpOnly; Secure; SameSite=Strict`** cookie.
- **Authorization:** one route-scoped middleware — everything under the authoring/API write prefix requires the session; everything else is public-by-default (structure beats behavior). The `SyncDocDO` WS upgrade also checks the session.
- **CSRF:** SameSite=Strict + Origin check on writes.
- **Recovery (single-user safety):** iCloud Keychain sync (passkey already on all his Apple devices) + a registered 2nd credential (YubiKey) + a `wrangler secret` break-glass token. Don't get locked out.
- **Not used:** Cloudflare Access (can't do native Touch ID without an upstream IdP) and managed auth providers (over-engineered for one user).

---

## 14. Define-once protocol — one schema, both sides derive (structurally)

- **The rule (your "what would Google do — write the contract once, generate both sides"):** *every* shape that crosses a boundary — Automerge document fields, RPC procedure inputs/outputs, SSE event payloads, D1 row types, **and the typed paths of §11.1** — is **defined exactly once** in `packages/schema/`. Client and server both **derive** from it; nothing is declared twice, so the two sides cannot drift. This is the literal enforcement of your protocol principle, not a convention.
- **Implementation:** `schema/` holds the definitions (Zod → inferred TS types) for all of the above; the typed-RPC layer (oRPC / tRPC v11) **infers the client from the server's procedure definitions**, so the "generated for both sides" property holds with full type-inference and *no* codegen step. If you ever want the *literal* proto/codegen discipline (e.g. a future non-TS client), the alternative is **Connect + protobuf** (`.proto` → generated client + server) on Workers — identical structural guarantee, heavier toolchain. The invariant is the same either way.
- **Enforced by (A)+(B):** `schema/` is a shared dependency of *every* package; no wire type is defined anywhere else. Every boundary — RPC handlers, the SSE emitter, the WebSocket sync envelope, DO storage writes — accepts only `schema/`-typed values and **`zod.parse`s on ingress**, so an unschema'd or malformed message physically cannot enter the system. ⚠️ oRPC-inference vs Connect-protobuf is the only open sub-choice (§17.7).

---

## 15. Deployment & environments

- **One SvelteKit Worker** (app + API + auth + RPC) + **`SyncDocDO`/`ReaderFeedDO`** DO classes + **R2/D1/KV** bindings, all in one `wrangler` project. DO migrations declared in `wrangler.toml`.
- **Dev:** local `wrangler dev` / Miniflare emulates D1/KV/R2/DO; tests via `vitest` + Workers pool.
- **Cutover:** build in this fresh repo; the Astro `benstone-site` stays live on `benstone.me` until the new system is complete and verified, then we repoint DNS. Private essays migrate from `benstone-content` into Automerge docs.
- **CI/CD:** deploy gated behind a `v*` tag (same discipline as today); commits/pushes don't ship.

---

## 16. Build order (AI-paced — build complete, then write)

Not an MVP-first dogfood ladder; a dependency order for **building the whole thing**, top to bottom, then Ben writes into a finished tool:
1. Repo scaffold: SvelteKit + adapter-cloudflare + wrangler + bindings + D1 schema + design tokens/component-library skeleton.
2. Automerge data layer + `entity(path)` façade + automerge-repo (IndexedDB) — local.
3. Editor: Tiptap headless + `@automerge/prosemirror` + invisible UX + focus mode.
4. Version history + branching UI.
5. Sync: `SyncDocDO` + WS adapter + R2 persistence + D1 metadata + cross-device.
6. Auth: passkeys + guard + DO upgrade check.
7. Publish + public reading plane (SSR + Tiptap static render) + `ReaderFeedDO` SSE live updates.
8. Motion pass across the whole UI.
9. Compaction cron; hardening; perf pass (measured).
10. Content migration + cutover.

---

## 17. ⚠️ Open questions to drive out before this is one-pass-implementable

1. ✅ **RESOLVED — Automerge ↔ Cloudflare sync wiring** (see §8.1). Per-doc `SyncDocDO` with hibernatable WebSockets; the DO is both storage + network adapter; reference impl `substrate-system/mergeparty`; we port the protocol onto raw DO handlers. No turnkey package — ~one focused session to build + test.
2. ✅ **RESOLVED — R2 storage** (§8.1). No maintained adapter; we implement the ~5-method `StorageAdapter` over the native R2 binding (automerge-repo's content-addressed key layout → auto-dedupe).
3. ✅ **RESOLVED — DO sharding.** One DO **per document** (not a library DO): independent hibernation, bounded memory, isolation; the D1 registry enumerates docs. Correct even for one author.
4. ✅ **RESOLVED — compaction.** Built into automerge-repo (self-compacts, lossless) — no Cron needed for correctness; branch ancestry kept safe by modeling each branch as its own document (§8) + gating deletes on the registry. Optional Cron only warm-snapshots idle docs.
5. **Reader live-update granularity:** SSE event-only + client refetch, vs push rendered content in the event.
6. **Authoring app rendering:** the editor is client-only (SPA island); public is SSR. Confirm the SvelteKit route split (private SPA vs public SSR) and that the editor never SSRs.
7. **oRPC vs tRPC v11 vs Hono RPC** for the thin imperative layer (minor).
8. **Schema/typing of Automerge docs** — Zod-validated doc shape + typed path builders so `entity()` paths aren't stringly-typed.
9. **Migration:** how `benstone-content` MDX essays convert into Automerge/ProseMirror docs.

---

*v0.2 — §17.1–17.4 resolved (sync wiring specified in §8.1). Remaining open items are minor (reader-update granularity, route split, RPC choice, doc schema, migration). The shape is locked; the how is largely nailed.*
