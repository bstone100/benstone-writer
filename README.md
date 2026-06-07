# benstone-writer

A **local-first writing & publishing platform** — the engine behind [benstone.me](https://benstone.me). Write offline in a chromeless editor; everything syncs and publishes from one place.

> **Status (honest):** the **engine is built and deployed** (live at `benstone-writer.bstone100.workers.dev`), and it works — local-first editing, history, publish → public reader, live updates, one-Worker Cloudflare deploy. The **authoring UI/UX is mid-rework**: the current split between a public reading plane and a separate "studio" is being collapsed into a single surface where the public page simply *becomes editable* when the owner is logged in. Auth is moving from Cloudflare Access to GitHub OAuth. Expect that layer to change.

## What it is

One person's writing tool that doubles as their public site. The same essay is a **read-only page** to a visitor and an **editable document** to the owner — two views of one entity, not two apps. It's offline-first: edits land instantly in a local CRDT and sync in the background; the public reader is server-rendered and ships **zero editor JS**.

## Stack — chosen per-problem, no house default

- **[SvelteKit](https://svelte.dev/docs/kit)** on **Cloudflare Workers** (`adapter-cloudflare`) — one Worker serves the app *and* hosts the Durable Objects.
- **[Automerge](https://automerge.org/)** — the local-first CRDT; the document is the source of truth, sync is background.
- **Cloudflare Durable Objects** — `SyncDocDO` (per-document, hibernatable-WebSocket Automerge sync over R2) + `ReaderFeedDO` (SSE fan-out for live reader updates).
- **D1 / R2 / KV** — published-post index (D1), Automerge change/snapshot storage (R2), edge config (KV).
- **[ProseMirror](https://prosemirror.net/)** + `@automerge/prosemirror` — the editor, bound to the CRDT.

## Architecture highlights

- **One Worker.** adapter-cloudflare emits a default-export Worker; a build step grafts the DO classes on as named exports so the app, the sync DO, and the feed DO ship as a single origin (so the auth cookie rides the sync WebSocket).
- **Local-first.** `read()` / `mutate()` / `collection()` over a path-addressed Automerge store; the UI never awaits the network to render or accept input.
- **Zero-JS public reader.** Published essays are server-rendered from a static HTML projection; the editor/CRDT bundle is lazy-loaded only behind the owner check.
- **Structurally-enforced craft.** Lint boundaries make the wrong shape *fail CI*, not code review: features can't import past the data layer, can't write `<style>`, and can't use off-token color/space/type values (ESLint import boundaries + Stylelint design-token enforcement + token-keyed component props).

## Run locally

```bash
pnpm install
pnpm dev                          # fast UI iteration (vite dev, no real bindings)
# or the whole thing on real (local, emulated) bindings:
pnpm --filter web build
cd apps/web && npx wrangler dev    # app + Durable Objects + D1/R2/KV via miniflare
pnpm test && pnpm check && pnpm lint
```

## Layout

```
apps/web        SvelteKit app (routes, server, the Cloudflare Worker)
packages/schema define-once: typed paths, Zod shapes, RPC contract
packages/data   the ONE data API (read/mutate/collection) over Automerge
packages/ui     the ONE component library + design tokens (the only place CSS lives)
workers/api     the Durable Object classes (sync + reader-feed), bundled into the app Worker
ARCHITECTURE.md the full design
```

Built with [Claude Code](https://claude.com/claude-code).
