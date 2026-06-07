# benstone-writer — Round Two Master Document

> **Status:** active spec for round two (the UX/auth/version-model rebuild).
> **Read alongside [`ARCHITECTURE.md`](./ARCHITECTURE.md)** (round one's master, §0–§17).
> Where the two conflict, **this document wins** — the supersession table is §3.4.
>
> This file exists because our sessions compact. It is the grounded spec any
> session picks up cold: what round one was, what was wrong with it, and exactly
> what round two builds and why. Trust the **VERIFIED** receipts in §4; they were
> proven first-hand (run code / read installed source), not taken from an agent.

---

## 0. How to use this document

- **Two-document system.** `ARCHITECTURE.md` describes the *engine* and remains
  authoritative for everything it specifies **except** the sections listed in the
  supersession table (§3.4). This document is the *lens* for round two: the
  surface (UX), authentication, and the version/publish model.
- **Round two does not touch the engine.** The local-first data layer, Automerge +
  automerge-repo, `SyncDocDO`/R2/D1, `ReaderFeedDO` SSE, the one-Worker deploy, and
  the structural-enforcement lint layer all **stay**. Round one's engine was good.
  Round one's *surface* was incoherent. Round two keeps the former and rebuilds the
  latter. (Explicit "what stays" list: §3.4.)
- **Scope discipline.** Round two delivers a **coherent, correct** single surface.
  Making it **beautiful** (visual craft, typography, structural animation) is
  **round three** (§7) — keep that line.

---

## 1. Round One — what was built (the receipts)

### 1.1 The arc
The architecture doc was refined to v0.3 ("implementable in one pass") and we
started coding. Round one = **everything from the first scaffold commit
(`6e2c39f`) to the stopping point (`bdb3811`, the README)** — built top-to-bottom
in the §16 dependency order. I then declared it done; Ben opened the UI, used it,
and tore into it. That teardown (§2.1) is what kicked off round two. The full
commit ledger is Appendix A.

### 1.2 What shipped (grounded in the ledger + file tree)
| Area | Built | Where |
|---|---|---|
| Monorepo + app | pnpm workspace; SvelteKit on adapter-cloudflare | `apps/web`, `packages/*`, `workers/api` |
| Data layer | path-addressed local-first `read`/`mutate`/`collection` over Automerge | `packages/data` |
| Editor | raw ProseMirror "invisible editor": input rules, keymap, slash menu, selection bubble, focus mode | `packages/ui/src/editor/*`, `Editor.svelte` |
| Sync | `SyncDocDO` (hibernatable-WS relay) + R2 storage adapter + custom browser WS adapter; proven E2E locally | `workers/api/src/*`, `packages/data/src/ws-client-adapter.ts` |
| History/branching | time-travel history + branch-from-any-point + branch picker | `History.svelte`, `BranchPicker.svelte`, `packages/data/src/history.ts` |
| Publish + reader | publish → SSR public reading plane (zero editor JS) | `routes/writing/*`, `lib/published.ts`, `Reader.svelte` |
| Live reader | `ReaderFeedDO` SSE fan-out — publish updates open readers in place | `workers/api/src/reader-feed-do.ts`, `routes/api/feed` |
| Motion | path-derived shared-element transitions | `packages/ui/src/motion.*` |
| Auth | Cloudflare Access single-admin gate + JWKS re-verify | `lib/server/access.ts`, `docs/AUTH.md` |
| Structural enforcement | ESLint import boundaries; Stylelint token-only CSS; §11.2 props-carry-identity; typed RPC contract | lint config, `packages/schema`, `lib/server/rpc.ts` |
| Command palette | ⌘K nav + actions | `CommandPalette.svelte` |
| Tests/CI | Vitest units + server-seam integration harness; GitHub Actions (typecheck, test, build, secret-scan) | `*.test.ts`, `.github/` |
| Deploy | **one-Worker unification** (SvelteKit + DOs + D1/R2/KV), proven locally **and deployed live** | `scripts/merge-worker.mjs`, `wrangler.jsonc` |

**Live:** `https://benstone-writer.bstone100.workers.dev` (verified responding this session).

### 1.3 What genuinely works (verified, kept wholesale)
The **engine**: local-first editing (input never waits on network), automatic
per-keystroke history, cloud sync over the DO, publish → zero-JS reader, live SSE
updates, the owner gate, and the single-origin one-Worker deploy. None of this is
in question in round two. It is the foundation round two builds the new surface on.

### 1.4 What round one did **not** do (architecture §16 steps 9–10)
- **Step 9** — compaction cron / hardening / measured perf pass. *Deferred.*
- **Step 10** — migrate `benstone-content` essays into Automerge docs + cut
  `benstone.me` over from the Astro site. *Deferred.*

These are **not** round two. Round two is the surface/auth/version rebuild; the
cutover comes after the app is actually good.

---

## 2. The Verdict — the analysis

### 2.1 Ben's teardown (faithful)
The entire UI is incoherent. Specifically:
- **There must not be a separate studio.** Ben writes and edits **inline on the
  public site** everyone sees — one surface, not two.
- The root `/` nameplate is **pointless**; the **index should be the root**.
- A non-owner visitor must **not** see an Edit button — they see a **Log In**
  button. When logged in it becomes **Log Out** (it does not disappear); owner
  controls (Edit, New essay) appear alongside it.
- **One editor, not multiple.**
- **GitHub login** (the Cloudflare Access UI is unbearable).
- **Document save status like Google Docs** — Saving… / Saved / Offline — and it
  is the **cloud round-trip** status (durability), **not** a local signal. It must
  be **faster than Google's**.
- **Identity is a UUID**, never an editable title/slug. **No slugs anywhere** —
  not in the URL, DB, or code. The **unix path is the URL**: `/documents/{uuid}`.
- The **Focus button is useless** — remove it.
- **No branch-name notion** in the UX. Don't show branch names.
- A **Google-Docs-style unified history list** with "restore this version."
- **Declaring a version live = setting a pointer** (a **crown** marks the live
  one); permanent **v1, v2 …** release tags; a **HEAD vs live** distinction.
- **Remove the primary Publish button entirely.** The only way to publish is a
  **⋮ three-dot context menu on every history item** (exactly like Google Docs):
  **Make live**, **Restore to draft** (roll that version's content up to head),
  **Name version**.
- **New essay** button top-right of the index when logged in; **drafts** visible.
- The two duplicate page-sets (`/writing` ≡ `/studio`, `/writing/{slug}` ≡
  `/studio/{id}`) **violate DRY**.
- **Animations are all shit** — parked for now (round three).

### 2.2 Claude's after-action analysis (owning the miss)
**Root cause — one mistake, several symptoms.** Architecture §1 separates the
system into two *planes* (private local-first authoring vs. public read-only
reading). That separation is **correct as a runtime/data truth** (heavy CRDT
machinery vs. a zero-JS reader). My error was carrying it into the **surface
(UX)** layer: I built §11.6's separate **`/studio`** *on top of* §11.5's
inline-edit model — so the app had **two parallel UIs and duplicate page-sets**
for the same entities. §11.5 already said "reader and editor are two views of one
path"; §11.6 contradicted it with a second destination, and I implemented **both**
instead of catching the contradiction. **One surface was always the right reading
of §11.5.** The plane split belongs in the backend, never in the navigation.

**Secondary misreads (each a symptom of the same "spec said it, I built it
literally" failure):**
- **Slugs.** §11.1 states *"the document's path is its URL"* — then §11.6 and §14
  introduced `/writing/{slug}` and `published/{slug}`, breaking §11.1's own
  principle. I followed §11.6. Round two's UUID-path URL **restores** §11.1.
- **Standalone Publish button.** §14.1.B/§11.8 specified a `publish` RPC and a
  `PublishControl`. Publishing is conceptually *"make this version the live one,"*
  an action **on a version**, not a global button. Round two moves it into the
  history ⋮ menu.
- **No cloud-save feedback.** I over-rotated on §2/§11.4's true statement
  ("local-first → input never waits") and wrongly concluded a save indicator was
  unnecessary — I even argued that to Ben. Local-first removes **input** latency;
  it does **not** remove the user's need for a **durability signal**. Both are
  required and they don't conflict (§4.2).
- **Branch-name UX.** §8 modeled rich fork/merge branching and I surfaced it
  (branch picker, names). It's too much machinery for a single author. Round two
  collapses the UX to **one linear history with HEAD/LIVE pointers** (§3.3); the
  engine's DAG stays, the branch *vocabulary* leaves the UI.
- **Focus mode.** Built per §10; useless in practice. Cut.

**Meta-lesson.** Where the round-one spec was wrong about UX, I implemented it
faithfully instead of reacting to it. The fix is the workspace's own rule —
**show, don't plan**: had the inline-edit surface been put in front of Ben early
(instead of a full studio built to spec), the two-surface incoherence would have
surfaced in minutes, not at "done."

### 2.3 One-sentence diagnosis
**Round one built a strong engine under an incoherent surface; round two keeps the
engine and rebuilds the surface into one.**

---

## 3. Round Two — the locked spec

### 3.1 Thesis
**One surface.** The public page every visitor sees **is** the page Ben edits, in
place, when he is logged in. There is no second app, no studio, no duplicate
route. Auth changes the *mode* of one surface; it never forks it into two.

### 3.2 Requirements (numbered, testable)
- **R1 — One surface, two routes.**
  - `/` — the **owner-aware index**. Visitor: identity line + list of published
    essays. Owner: additionally the **drafts** and a **New essay** button.
  - `/documents/{uuid}` — the **owner-aware essay**. Visitor: SSR read-only of the
    **live** version, zero editor JS. Owner: the same URL becomes **editable in
    place**, with the history panel.
  - **Delete** `/studio`, `/studio/*`, and the duplicate `/writing` + `/writing/{slug}`.
    (`/work`, `/about`, `/contact` from §11.6 are out of scope for now.)
- **R2 — Path *is* URL; UUID identity; no slugs.** An essay's identity is a
  **UUID**, never a title or slug. Its internal path `["documents", uuid]` joined
  by `/` **is** its URL, `/documents/{uuid}`. **No slug exists anywhere** — URL,
  D1, or code. (The D1 published index moves from slug-keyed to **uuid-keyed**.)
- **R3 — GitHub OAuth replaces Cloudflare Access.** Arctic (handshake) + jose
  (signed session cookie); gate on the **immutable numeric GitHub id `57852724`**,
  never the username. The button is a **Log In ⇄ Log Out toggle**; owner controls
  render alongside it. Cloudflare Access (`access.ts`, `docs/AUTH.md`) is removed.
- **R4 — Cloud-save status (faster than Google).** **Saving…** (the cloud has not
  acked the latest heads) → **Saved** (the DO persisted them) → **Offline** (socket
  down). This is the **cloud round-trip**, the Google-Docs "Saved to Drive"
  meaning — and it must beat Google's latency (§4.2 shows an order of magnitude of
  headroom). Local-first input latency is **unchanged** (input still never waits).
- **R5 — Version model + history ⋮ menu** (detail in §3.3). One **linear** history
  list (Google-Docs style). Every item carries a **⋮ menu**: **Make live** /
  **Restore to draft** / **Name version**. A **crown** marks the live version;
  **Make live** assigns the next permanent **vN** release tag.
- **R6 — Removals.** The standalone **Publish button**, **Focus mode**, and **all
  branch-name UX** are removed from the surface.
- **R7 — New essay + drafts.** Owner sees a **New essay** button (top-right of the
  index) and the list of **draft** (never-made-live) documents.
- **R8 — Animations parked.** No motion work in round two beyond not regressing;
  structural animation is round three (§7).

### 3.3 The version / publish model (from the §4.1 verified probe)
One **linear, append-only** version log (the Automerge change DAG, displayed as
coarse edit-sessions). Two orthogonal pointers over it:
- **HEAD** — the editing tip. What the owner edits; advances on every change.
- **LIVE** — a movable pointer to the version the **public sees**. Publishing is
  nothing but **moving LIVE**.

A **"version"** in the history list = a set of Automerge **heads** (an
edit-session boundary). `view(doc, heads)` renders that version's exact content
for free (§4.1). The public reader renders `view(doc, liveHeads)`; cache key =
the live heads (content-hash ETag).

**The ⋮ menu on every history item:**
- **Make live** → set `LIVE = thisVersion.heads`. The server assigns the **next
  permanent monotonic `vN`** (a strict counter — stored in **D1**, because a CRDT
  cannot do a strict counter), moves the **crown**, re-renders the public
  projection, and notifies the reader-feed.
- **Restore to draft** → roll this version's content **forward to HEAD** via a
  plain `change()` (verified linear, **no fork** — §4.1). The draft becomes equal
  to that old version; nothing in history is lost.
- **Name version** → attach an optional human label to this version (the
  Google-Docs "Name this version"). Distinct from the automatic `vN` tag.

**Why no `changeAt`:** §4.1 proved `changeAt(oldHeads, …)` **forks** (>1 head).
Restore must be a forward `change()` to stay linear. This is a hard rule.

### 3.4 Supersession — what this overrides in `ARCHITECTURE.md`
| Architecture § | Round-one decision | Round-two ruling |
|---|---|---|
| **§11.6** (IA / routes) | public `/` + `/writing` + separate `/studio` | **REVISED** → one surface: `/` (owner-aware index) + `/documents/{uuid}` (owner-aware essay) + `/auth/*`. Studio deleted. |
| **§11.5** (inline editing) | one option *alongside* a studio | **PROMOTED** → the **only** authoring model. |
| **§11.1 / §14.1 / §9** (slugs) | `/writing/{slug}`, `published/{slug}` | **REVISED** → UUID path is the URL; published index uuid-keyed. (Restores §11.1.) |
| **§8 / §14.1.B `branches.*`** | fork/merge + named branches surfaced | **REVISED** → engine keeps the DAG; UX is one linear log with HEAD/LIVE pointers. No branch names. |
| **§10** (focus mode) | shipped | **REMOVED** from UX. |
| **§13 + `docs/AUTH.md`** | Cloudflare Access | **REPLACED** → GitHub OAuth (Arctic + jose). §13's *principle* (own minimal security code; public-repo threat model; the §13 rejected-alternatives list) **stays**. |
| **§14.1.B publish + §11.8 `PublishControl`** | standalone Publish button | **REVISED** → publishing = "Make live" from the history ⋮ menu; server verb stays (set-live + assign `vN`). |
| **§0** ("passkey only", "biometric auth") | passkey | **SUPERSEDED** (already once → Access; now → GitHub OAuth). |

**What explicitly STAYS (do not touch in round two):** §11.1–§11.4 data-layer &
structural-enforcement model; the Automerge / automerge-repo engine; `SyncDocDO` +
R2 storage adapter + the custom WS client adapter (§8.1); `ReaderFeedDO` SSE (§7
#5, §9); the one-Worker deploy (§15); the lint boundaries + token-only CSS + typed
paths + typed RPC contract (§11.3/§11.7/§14). The zero-JS reader principle (§11.5)
is **strengthened**, not weakened.

---

## 4. Verified research (first-hand — the receipts)

> **Standing rule (Ben's):** verify every load-bearing fact first-hand — run code
> or read the *installed* source — never trust a research agent. Each finding
> below is tagged **VERIFIED** (proven this way) or **INFERRED/DESIGN** (a reasoned
> decision still to be confirmed by the build).

### 4.1 Version / restore model — **VERIFIED**
Ran `workers/api/_probe-versions.mjs` against the installed **Automerge 3.2.6**;
**8/8 assertions pass.** Proven:
- A version **is** a set of heads; `view(doc, heads).body` is that version's exact
  content (free, cheap snapshot).
- **Restore = a forward `change()`** writing the old content back → **one linear
  head**, exactly **+1** change, history grows by exactly 1, commit message
  preserved. No fork.
- **`changeAt(oldHeads, …)` forks** (>1 head) — **must not** be used for restore.

This is the entire basis of §3.3. The probe is a re-runnable receipt; keep it.

### 4.2 Cloud-save status ("Saved" = durable in R2) — **IMPLEMENTED + VERIFIED (step 4)**
- Sync stack is **automerge-repo 2.5.6** (confirmed via the resolved symlink and
  `package.json`; an earlier "2.6.0-prerelease" scare was a **stale pnpm-store
  dir** and is false — the linked version is 2.5.6). In 2.5.6 source: a DO can
  report persisted heads and clients can observe them (`getRemoteHeads`,
  `"remote-heads"` event, `heads()`, `enableRemoteHeadsGossiping`). So a
  "cloud has my latest" signal is real.
- **The goal is HONESTY, not beating Google** (Ben's correction — the "beat
  Google" framing biased the first attempt into a per-keystroke race that stormed):
  the indicator shows *exactly* when the work is durably backed up so the user
  knows it's safe to close the tab — **never a false "Saved."** Google-like timing
  (a beat after you pause) **emerges naturally** because the sync layer auto-saves
  on a debounce; we don't force it. Latency floor to the live Worker: ~33 ms warm.
- **The honest, non-storming design (hard-won — commit `d18f908`):**
  - The DO must **NOT** force a flush per change. `repo.flush()` per change — OR
    reading `handle.doc()`/`repo.find()` on the handle to ack **mid-sync** — *re-
    enters automerge-repo's synchronizer and STORMS it* (15k–95k sync frames for a
    handful of edits; the doc never converges). **Never touch the handle during
    sync to produce an ack.**
  - automerge-repo **already auto-saves to R2 on a debounce** (`asyncThrottle`);
    we just **report** it. `R2StorageAdapter` fires a callback AFTER each durable
    `put`; the DO acks the storage subsystem's `savedHeads` (post-persist, captured
    from the `doc-saved`/`doc-compacted` events) via a `"saved"` frame. Client:
    local heads == durable heads → **Saved**; behind → **Saving…**; socket down →
    **Offline**.
  - Honesty is **post-persist**: `doc-saved` fires PRE-write, so we ack only once
    the matching R2 `put` resolves. Verified the acked heads exactly equal the
    durable R2 heads.
- **MEASURED end-to-end** (wrangler dev, real DO+R2, real browser): realistic
  sustained typing settles to a durable **Saved** with ~33 sync frames (no storm);
  edit→durable-**Saved ~20–50 ms** locally; **Offline** on server-kill is instant.
- **Initial ack (open-but-never-edited):** on the first sync from each client the DO
  reads the doc's durable heads **straight from R2** (independent of the Repo handle,
  which storms mid-sync) and acks them — so opening an existing doc shows "Saved" at
  once (verified). A brand-new doc (no R2 chunks) gets its first ack via `onPersist`.

### 4.3 GitHub OAuth — **VERIFIED** (including the trap that only bites in production)
- **User-Agent trap is real and proven.** `api.github.com` with **no** UA →
  **HTTP 403** *"Please make sure your request has a User-Agent header"*; **with** a
  UA → **200**. It is **invisible in `vite dev`** (Node's `fetch` adds a UA) and
  **lethal in workerd** (sends none). The `/user` call that reads the immutable
  numeric id goes through `api.github.com`, so **I set the UA explicitly** there.
- **Arctic 3.7.0** (read from installed `dist/`): its `createOAuth2Request` sets
  `User-Agent: "arctic"` on the token-exchange request → that call is **safe in
  workerd**. Arctic does **not** call `/user` — that's mine to make (with a UA).
- **Exact API (from source):** `new GitHub(clientId, clientSecret, redirectURI)`
  → `.createAuthorizationURL(state, scopes)` / `.validateAuthorizationCode(code)`
  → `tokens.accessToken()`; `generateState()` for CSRF. GitHub = **confidential
  client, no PKCE** (HTTP Basic with the secret), which is correct for GitHub
  OAuth Apps.
- **jose 6.2.3** is already installed and **already proven in workerd** in this
  repo (the current `access.ts` verifies JWTs with it via WebCrypto) → low-risk
  for HS256 session signing.
- **Owner gate value (fetched live):** GitHub id **`57852724`** (`bstone100`,
  "Ben Stone"). Public, not a secret — lives in config/code.

### 4.4 Auth testability — **DESIGN (no production bypass)**
Separate **session** from **handshake**:
- The session is a jose-signed **`__Host-` cookie** carrying the GitHub id; the
  **`SESSION_SECRET` is the trust root**.
- **Tier 1 (95% of testing):** mint a valid **dev session** with the local
  `SESSION_SECRET` and drive **every** behind-auth flow (inline edit, ⋮ menu, make
  live, restore, save-status) deterministically — no GitHub round-trip, **no
  bypass route in the app** (possessing the secret = being the operator; prod's
  secret lives only in Cloudflare).
- **Tier 2 (the handshake itself):** drive a **real** GitHub login against the
  deployed app via **Claude-in-Chrome** (Ben's GitHub session is in the browser),
  and/or a unit test with **mocked GitHub HTTP**. **Zero bypass code ships.**

### 4.5 Path-as-URL routing + the ⋮ menu primitive — **LOW-RISK (no probe)**
Standard SvelteKit (`/documents/[id]`, `id` = UUID) + a token-driven **Menu /
Popover** primitive in `packages/ui` (anchor + items, Escape/click-outside/focus
trap, accessible). No first-hand probe needed; verify during the build.

---

## 5. The build plan (ordered, with acceptance criteria)

> Built one step at a time, show-don't-plan, each verified before the next. Steps
> 1–5 are fully testable **before** Ben's GitHub OAuth App exists, via the
> mint-session harness (§4.4); only the final real-handshake check needs it.

**Step 1 — Auth foundation.**
Build the jose session (sign/verify `__Host-` cookie on the GitHub id) + the
mint-session test harness; an `isOwner(event)` that reads the session (replacing
the Access version); Arctic routes `/auth/login`, `/auth/callback` (state check,
UA on `/user`, gate on `57852724`), `/auth/logout`. Remove `access.ts` JWKS path.
*AC:* a minted dev session passes `isOwner`; a forged/absent cookie fails;
`/auth/login` builds a correct authorize URL; unit test covers callback
state-mismatch + non-owner id rejection.

**Step 2 — Collapse to one surface + UUID routing.**
`/` becomes the owner-aware index; add `/documents/[id]` (read-only SSR for
visitors, editable-in-place for owner). Delete `/studio*` and `/writing*`. Move
the published index in D1/`published.ts` from slug-keyed to **uuid-keyed**.
*AC:* visitor GET `/documents/{uuid}` of a live doc → SSR HTML, zero editor JS;
owner GET same → editor mounts in place; no slug appears in any URL, query, or row;
`/studio` and `/writing` 404.

**Step 3 — Log In ⇄ Log Out toggle + owner controls.**
Header shows **Log In** to visitors, **Log Out** to the owner, with **New essay**
(index) and the inline **Edit** affordance (essay) alongside. New essay mints a
UUID doc and routes to `/documents/{uuid}`.
*AC:* toggle reflects session state; visitor never sees owner controls
(server-gated, not just hidden); New essay creates a doc and lands in the editor.

**Step 4 — Cloud-save status + latency receipt.**
`SyncDocDO` sends a direct ack after R2 persist; client surfaces
**Saving…/Saved/Offline** from local-heads ⊆ acked-heads. Measure end-to-end
latency (baseline + after) and record it.
*AC:* status reaches **Saved** within the measured budget after a keystroke
settles; pulling the socket shows **Offline**; recorded number **< Google** and is
written into this doc (§4.2).

**Step 5 — History ⋮ menu + version model; remove publish/focus/branch UI.**
The linear history list; the `Menu` primitive; **Make live** (set LIVE, assign
`vN` in D1, crown, re-render, notify feed), **Restore to draft** (forward
`change()`), **Name version**. Delete the Publish button, Focus mode, and branch
UI.
*AC:* Make live moves the public projection + assigns a monotonic `vN` + crown;
Restore makes HEAD equal a chosen version with **one** new linear head (§4.1);
no Publish/Focus/branch affordance remains.

**Step 6 — Verify end-to-end + deploy.**
Mint-session locally across every flow; **Claude-in-Chrome real GitHub login**
against the deploy; latency receipt; then deploy.
*AC:* a real GitHub login as Ben reaches owner mode on the live origin; a
non-owner is denied; readers still get live updates; `pnpm test && check && lint`
green.

---

## 6. Open dependencies & the one decision

- **Ben — create one GitHub OAuth App** (not blocking the build; only the final
  real-handshake test needs it):
  - Homepage `https://benstone-writer.bstone100.workers.dev`
  - Callback `https://benstone-writer.bstone100.workers.dev/auth/callback`
  - Send the **Client ID** (→ config, not secret); generate a **Client Secret**
    (→ Worker secret via `wrangler secret put GITHUB_CLIENT_SECRET`, never in repo).
- **Decision (Claude's call; Ben may veto):** **"Saved" means durable**
  (ack-on-R2-persist), per §4.2. Status vocabulary: Saving… / Saved / Offline.

---

## 7. Round Three (the scope boundary — NOT round two)

Round three is **Ben-guided UI perfection**: the actual look — typography, spacing,
color, the reading/writing measure, the chrome — and **structural animation**
re-introduced *meaningfully* (path-derived transitions that teach the data model,
per §12, now that the surface is coherent enough to animate). Round two's job is to
make the app **correct and coherent**; round three makes it **beautiful**. Do not
pull round-three polish into round two.

---

## Appendix A — Round-one commit ledger
Grouped by the §16 build order (newest first within the round):
```
bdb3811 docs: README — honest project state                     ← stopping point
b476f49 feat(deploy): one-Worker unification (SvelteKit+DOs+D1/R2/KV)
46f1796 test(integration): server-seam harness
fbe1a79 feat(studio): command palette (⌘K)
c9fa87e feat(reader): inline editing (read+edit = one entity)    ← §11.5, the right idea
169bbcc feat(editor): focus mode                                 ← removed in round 2
6ff6090 feat(editor): slash menu
97caddb feat(editor): selection bubble + floating overlay
dbcf249 feat(editor): markdown input rules + keymap
f76933e feat(rpc): typed RPC contract
5bbb938 feat(lint): §11.2 props carry identity
068be94 feat(ui): component library + no-feature-CSS
39bf753 build(lint): Stylelint token enforcement
d9e6b79 build(lint): ESLint import boundaries
e5750cd feat(branches): branch picker                            ← branch UX removed in round 2
bad7c88 feat(motion): shared-element morph
913d437 feat(reader-feed): live updates over SSE
2cc8a62 ci: GitHub Actions
1537bde test(data): history session-folding
c42e2a9 test: unit suite (Vitest)
1779fe1 feat(auth): Cloudflare Access single-admin gate          ← replaced in round 2
056d62d feat(motion): studio + same-document transitions
68cd855 feat(motion): path-derived shared-element transitions
04d0076 fix(publish): excerpt paragraph join
b0bfaff feat(publish): publish → SSR reading plane
0ab8ef7 feat(history): time-travel + branch-from-any-point
7f84354 feat(sync): real-time cloud sync via DO + R2 (E2E)
eb33d1c wip(sync): scaffold sync Worker; R2 adapter + WASM
262debc feat(ui): invisible editor as first @bw/ui component
20c9c4a feat(editor): commit to raw ProseMirror
311196f feat(data): path-addressed local-first data layer
6e2c39f build: scaffold pnpm monorepo + SvelteKit app           ← round one begins
```

## Appendix B — Grounding constants (verified this session)
- **GitHub owner id:** `57852724` (`bstone100`) — the auth gate value; public, config.
- **Live origin:** `https://benstone-writer.bstone100.workers.dev`.
- **Verified dependency versions** (from the read `package.json`s): Automerge
  **3.2.6**, automerge-repo **2.5.6**, Arctic **3.7.0**, jose **6.2.3**, Vite
  **^7.3.5** (NOT 8 — its rolldown bundler crashes in workerd), vite-plugin-svelte
  **^6.2.4**, Svelte **^5.55.2**.
- **Infra IDs (account/D1/KV/R2):** the source of truth is `apps/web/wrangler.jsonc`
  (read it; do not hardcode here). These are **not** secrets. No secret is ever
  committed; the GitHub Client Secret is a Worker secret only.

---

*Round-two master. Supersedes the §3.4 sections of `ARCHITECTURE.md`; everything
else there still holds.*
