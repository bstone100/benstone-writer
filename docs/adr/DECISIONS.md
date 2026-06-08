# benstone.me — Architecture Decision Record

Append-only record of the **architecture decisions that shaped the code** (benstone-site/Astro → benstone-writer/Svelte+Cloudflare → benstone.me), and the reversals of ones that did. *Not* a log of everything discussed — design tangents that never shipped (the gem game, essay-voice work, brand exploration) are deliberately excluded. Code is the source of truth for *what*; this is the source of truth for *why*.

**`Decided by`**: `strong-human-conviction` (Ben drove it) · `ai-recommended-human-endorsed` (Claude proposed, Ben agreed) · `ai-default-human-wavedthrough` (Claude defaulted, Ben didn't engage — most reversible) · `human-override` (Ben chose against Claude). `Why (Ben): Not captured` = reasoning never stated.

_37 decisions · 2026-05-18 → 2026-06-08._

---

## ADR-0001 · Astro as the site framework
**2026-05-26** · _benstone-site_ · `ai-recommended-human-endorsed`

**Decision.** In the context of a content-heavy, writing-first portfolio that must be fast and open-sourceable, facing the choice of frontend stack, chose Astro (static-first, Markdown/MDX content) over a React SPA to achieve fast static pages and content-as-files, accepting Astro-specific conventions.

**Context.** Ben wants the site 'designed properly and not lazy react slop' and open-sourced as an example project. The content is writing-heavy (essays + case studies). A framework choice is needed.

**Options.**
  - ✓ **Astro 5/6 + MDX content collections** — Static-first, no client JS by default, MDX content lives as .md files, Lit-compatible, one-config Cloudflare Pages deploy, used by Anthropic/Cloudflare-style technical blogs
  - ✗ **React SPA ('react slop')** — Ben explicitly didn't want lazy React slop; wrong tool for a content/reading-first site
  - ✗ **Astro Starlight or a Vercel template (earlier 05-18 suggestion)** — Superseded by a hand-built Astro structure once the site grew beyond one page

**Consequences.**  
_Good:_ Content authored as MDX, fast static output (~650ms build, sub-second pages); Clean Cloudflare Pages deploy path  
_Cost:_ Hit Astro version-specific config churn during build: content config path moved from src/content/config.ts to src/content.config.ts on Astro 6

**Why (AI).** Claude argued Astro is static-first, markdown-native ('how serious technical blogs are built now'), component-friendly when needed, Lit-compatible with Ben's stated frontend direction, and deploys to Cloudflare Pages so 'recruiters at Cloudflare notice this.'
**Why (Ben).** Not captured (Ben said 'yes do all of these things' to the proposal en bloc, and earlier set the constraint 'design it properly and not lazy react slop' — but did not articulate a reason specifically for Astro).

**↔ Reversal / supersession.** Workspace CLAUDE.md later flags 'not even Astro' as holy — implying Astro persisted as the choice but is explicitly open to reconsideration.

---

## ADR-0002 · Domain: benstone.me
**2026-05-26** · _benstone-site_ · `ai-recommended-human-endorsed`

**Decision.** In the context of a multi-disciplinary personal portfolio, facing a TLD/name choice, chose benstone.me ($16) over .dev/.io and abbreviated/initial variants, because .me is the universal personal-portfolio TLD that fits content breadth (vs .dev which would frame everything as 'engineering'), accepting a slightly less 'engineer-coded' URL.

**Context.** benstone.dev was unavailable. Ben priced out many alternatives across .me/.io/.dev/.com and abbreviations/middle-initial variants.

**Options.**
  - ✓ **benstone.me** — Natural thing to type; .me fits polymath breadth; clean real name; cheap
  - ✗ **benjaminstone.dev ($12)** — Named as a strong backup for a harder engineer signal; not chosen
  - ✗ **bstone.dev / benst.one (earlier picks)** — Earlier-favored before availability/price list; superseded by .me
  - ✗ **Anything with '100' (bstone100.*) or stoneben.com** — '100' reads junior; stoneben reads like a squat/wrong word order

**Consequences.**  
_Good:_ Clean, memorable, on-brand for breadth; Bought via Cloudflare Registrar (free WHOIS privacy, integrates with Pages)  
_Cost:_ Less engineer-coded than .dev for the no-AI/rigorous-interview targets

**Why (AI).** Claude argued .me suits a deliberately multi-disciplinary site (a .dev would 'compress the marketing/philosophy essays' into 'engineering content'), it's the lowest-friction thing to type, and it's cheap.
**Why (Ben).** Not captured beyond the purchase ('okay bought it through cloudflare') — Ben accepted Claude's recommendation without stating his own reason.

**↔ Reversal / supersession.** Workspace projects.md notes the project later became benstone-writer / benstone.me — the domain persisted into the later rebuild.

---

## ADR-0003 · Three-repo content architecture on a sensitivity gradient (public site + private content submodule + air-gapped brand)
**2026-06-02** · _benstone-site_ · `human-override`

**Decision.** In the context of separating public code from private drafts, facing the all-or-nothing git-history constraint, chose three repos on a sensitivity gradient — public benstone-site (code + content schema, mounting content via private git submodule at src/content/), private benstone-content (all MDX drafts+published), private air-gapped benstone-brand (revenue/M&A/kill-switch/photos, no remote) — over copy-on-publish or a single repo or a headless CMS, to make the bad shape (content in the code repo) structurally impossible, accepting submodule footguns (two-step commit, detached HEAD, must-push-before-pin).

**Context.** Ben wanted website code public (portfolio signal) but essay drafting history private. Claude established git history is all-or-nothing per repo, so privacy boundary = repo boundary. Ben rejected copy-on-publish (still mixes published prose into the code repo) in favor of a submodule.

**Options.**
  - ✗ **Single public repo, drafts and all (Gwern style)** — Ben wants drafting history hidden
  - ✗ **Copy-on-publish (two repos, copy final file into public)** — Ben: published prose still ends up in the code repo — the mixing he's rejecting
  - ✗ **Headless CMS (Sanity/Contentful/Keystatic)** — Content in a vendor DB (no files for an AI agent to edit); reads as SaaS lock-in to a reviewer; over-engineered
  - ✓ **Private content git submodule (3-tier)** — Content 100% out of the code repo; pin = release-manifest; precedent (Tania Rascia) is live; git-native reads as most impressive to a technical reviewer
  - • **Build-time clone instead of submodule** — Less standard git; pin lives as a ref string not a real submodule object

**Consequences.**  
_Good:_ Structurally enforced public/private boundary (not 'remember to be careful'); Submodule pointer SHA acts as a content release manifest, matching Ben's OTA-pinning mental model; Sensitivity-gradient segmentation mirrors Ben's OT/IT network split; Verified end-to-end green CI/deploy  
_Cost:_ Submodule footguns (two-step commit, detached HEAD, forgot-to-push-submodule); An outsider can't build benstone-site without content access; CF Pages native git can't fetch private submodule — requires GitHub-Actions checkout with a token

**Why (AI).** Claude initially recommended copy-on-publish ('fewest moving parts'), then corrected: 'Copy-on-publish leaves the published prose sitting in the public code repo — exactly the mixing your instinct is rejecting. The submodule keeps content 100% out of the code repo.' Grounded the final design in live precedent (Tania Rascia, GitHub/Cloudflare docs CI) after Ben pushed for evidence.
**Why (Ben).** 'my instinct says copying the final version into the public repo when done is wrong and that mdx and marketing copy and prose and anything potentially sensitive or private doesn't belong in the the same repo at all as the structural website code.'

**↔ Reversal / supersession.** Reverses Claude's first recommendation (copy-on-publish two-repo); separately, all the brand/interview material being NOT under version control was fixed by creating the air-gapped benstone-brand repo.

---

## ADR-0004 · No React; reactivity framework constraint
**2026-06-05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of the rebuild's UI framework, facing framework choice, chose to exclude React entirely as a hard constraint over allowing it, to avoid React's pitfalls (boilerplate, easy bad perf, no separation of concerns), accepting that the framework must be chosen from the non-React landscape.

**Context.** Ben laid out a long critique of React (bad code easy, hooks boilerplate, JSX god-files, whole-page re-renders).

**Options.**
  - ✓ **Any non-React reactive framework** — React makes bad code/perf easy; hooks are boilerplate; JSX blurs SoC
  - ✗ **React + Motion** — Ben's day-job stack; the workspace ethos says don't default to the familiar; he can't stand it

**Consequences.**  
_Good:_ Narrowed to Svelte/Solid/Qwik/Vue; Sets up the Svelte choice

**Why (AI).** Claude: React structurally can't do fine-grained no-re-render; JSX is the blur Ben can't stand.
**Why (Ben).** "it makes bad code and performance easy, hooks are stupid boilerplate... very easy for the code to get out of control by jsx files becoming god files."

---

## ADR-0005 · Path-addressed data model; components self-subscribe by path (no prop-drilling)
**2026-06-05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of the client data architecture, facing prop-drilling vs. self-subscription, chose a path-addressed data hierarchy where components receive a path and self-subscribe to that entity's change events over passing domain objects through props, to make components self-contained and placeable anywhere in the scene graph, accepting a façade layer over the data substrate.

**Context.** Ben articulated a Unix-filesystem-style data model as core to how the app should be built.

**Options.**
  - ✓ **Path-addressed store; entity(path) façade; components grab path + subscribe** — Unix-style; self-contained components; near-verbatim Firebase RTDB ref(path).on()
  - ✗ **Prop-drilling objects down** — Ben: 'not good programming'

**Consequences.**  
_Good:_ Became §11.1/§11.2; later enforced by lint (no Document props, no @bw/data internals in features)  
_Cost:_ The Reader's PublishedPost prop was initially mis-flagged as a violation

**Why (AI).** Claude: this is Firebase RTDB married to signals; a thin entity(path) façade so components never touch the engine.
**Why (Ben).** "components who need data should... be passed the unix style path of the entity whose data they need to render, and... grab the initial data and subscribe itself to that entity's data changed events."

---

## ADR-0006 · Component library / design system; style written once via tokens
**2026-06-05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of UI consistency, facing scattered custom CSS, chose a single component library + design tokens where style is written once over per-feature CSS, to make consistent UI structural, accepting that features must compose components rather than style freely.

**Context.** Ben insisted on a component library/design system to keep UI consistent and prevent scattered CSS.

**Options.**
  - ✓ **One component library + tokens; features write no CSS** — Keeps UI consistent; prevents custom CSS everywhere
  - ✗ **Per-feature custom CSS/components** — 'prevent at all costs there being custom css and components all over the place'

**Consequences.**  
_Good:_ Became @bw/ui with tokens.css as the single source; later enforced by ESLint+Stylelint+typed props  
_Cost:_ Initial build deferred enforcement; audit found it convention-only until remediated

**Why (AI).** Claude later built typed token-keyed prop unions so a feature can't even express a raw value.
**Why (Ben).** "the purpose is make your uis consistent and prevent at all costs there being custom css and components all over the place."

---

## ADR-0007 · Live updates / real-time push as a non-negotiable (never reload/poll)
**2026-06-05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of all delivery/reactivity, facing reload/poll vs. push, chose real-time push (publish → open tabs update live, no refresh) as a non-negotiable, with a define-once typed contract over a hand-rolled WebSocket JSON-RPC, to never make the user wait, accepting the need to pick a sync engine / typed contract rather than improvise.

**Context.** Ben stated his real-time philosophy and the pitfall of hand-rolling a websocket JSON-RPC protocol.

**Options.**
  - ✓ **Real-time push; 'what would Google do' — write the contract once, generate both sides** — Real-time is about user perception; never make the user wait
  - ✗ **Reload / refresh button / polling** — 'those are all bullshit'
  - ✗ **Hand-roll a websocket JSON-RPC + event protocol** — Right idea (websockets) but too general a tool; the trap

**Consequences.**  
_Good:_ Drove the typed schema contract and the SSE reader-feed; Recorded as a hard principle  
_Cost:_ Claude later tried to skip the reader-feed and was sharply corrected

**Why (AI).** Claude: the trap is hand-rolling a WS JSON-RPC; the answer is a typed contract (the substrate schema) + a thin typed RPC for side-effects.
**Why (Ben).** "I will never allow one of my apps to force the user to reload the page... or wait for a poll... real time is about user perception of the task not the task itself."

---

## ADR-0008 · Motion is core architecture, not a layer (Core-Animation analogy)
**2026-06-05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of animation on the site, facing library-bolt-on vs. architectural primitive, chose motion as a core architectural concern (state-driven, framework-native, View-Transitions-based) over an add-on motion library, to make animation a consequence of state/structure like Core Animation, accepting that the framework choice must support motion-as-a-language-feature.

**Context.** Ben rejected motion-as-library, demanding it be a platform-primitive-like part of the architecture.

**Options.**
  - ✓ **Motion as a core primitive (Svelte Spring/Tween + View Transitions, state-driven)** — Core Animation is a platform primitive, not an import
  - ✗ **Motion as a bolt-on library layer** — Ben: animation shouldn't be a layer
  - ✗ **Render UI to canvas/WebGL scene graph** — Throws away text/a11y/SEO a writing site can't lose; the signals tree IS the retained-mode scene graph

**Consequences.**  
_Good:_ Became §12: path-derived transitions (descend/ascend/lateral) + shared-element vtName, the one principle the audit found genuinely structural

**Why (AI).** Claude: you already have a retained-mode scene graph — the signals reactive tree; animate its values. Do not render to canvas.
**Why (Ben).** "like apple's core animation is a core part of macos and ios, not some add on library."

---

## ADR-0009 · Auto-versioning + branching history (Google-Docs UX, git semantics, zero ceremony)
**2026-06-05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of revision history, facing git-style ceremony vs. automatic versioning, chose auto-captured versioning with UI-driven branch-from-any-version (pick a past version as live, keep abandoned work) over forcing git onto the writing, to get Google-Docs UX with git-like branching and zero ceremony, accepting a CRDT substrate that supports it.

**Context.** Ben described wanting Google-Docs-style automatic version history that can branch, without git's manual ceremony.

**Options.**
  - ✓ **Automatic versioned store; select a version as live = branch from there** — Google Docs UX is king; git is annoying/manual even in GUIs
  - ✗ **Force git onto the writing** — Ben never enjoyed git; learn from Docs instead

**Consequences.**  
_Good:_ Became the signature feature; drove the Automerge substrate choice; implemented as fork_at/clone(view(doc,heads))

**Why (AI).** Claude: a versioned store keeps every state; the UI just lets you pick one as live — Google-Docs UX, git semantics, zero ceremony.
**Why (Ben).** "google docs is a much superior ui and ux to github desktop... it would be great if our thing sort of branched automatically."

---

## ADR-0010 · Invisible word-dump editor; never markdown
**2026-06-05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of the editor surface, facing markdown/WYSIWYG, chose an invisible paragraph-first editor that disappears (no markdown syntax, light structure via slash/selection) over a markdown editor or formatting-heavy WYSIWYG, to facilitate Ben's word-dump style, accepting that structure must appear without syntax.

**Context.** Ben described his writing style (long word-dumps, occasional paragraph breaks, no markdown).

**Options.**
  - ✓ **Invisible editor, plain rich text, no markdown (iA Writer/Bear feel)** — Markdown doesn't come naturally to Ben; word-dumps should just flow
  - ✗ **Markdown editor** — Slows Ben down
  - ✗ **Formatting-heavy WYSIWYG** — Not Ben's style

**Consequences.**  
_Good:_ Defined the editor's chromeless design and the no-markdown stance

**Why (AI).** Claude: not a markdown editor and not formatting-heavy — something that disappears, plain rich text.
**Why (Ben).** "my style is to just write long word dumps... I certainly don't want to write markdown."

---

## ADR-0011 · Framework: SvelteKit (Svelte 5 runes) on Cloudflare
**2026-06-05** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of the rebuild's framework, facing Svelte/Solid/Qwik/Vue (React excluded), chose SvelteKit (Svelte 5 runes) on Cloudflare over Solid (runner-up) to get script/markup/style separation by construction, a compiler that makes best-practices trivial, fine-grained no-re-render reactivity, and a stable Cloudflare adapter, accepting Svelte's smaller ecosystem vs. React.

**Context.** After the seven-agent research, the framework + motion agents independently converged on Svelte.

**Options.**
  - ✓ **SvelteKit (Svelte 5 runes)** — .svelte separates concerns by construction; compiler = IoC; signals = no whole-page re-renders; first-party CF adapter
  - ✗ **Solid** — Runner-up; lost on JSX (the blur Ben hates) + beta CF story
  - ✗ **Qwik** — Also uses JSX
  - ✗ **React + Motion** — Already excluded by Ben

**Consequences.**  
_Good:_ Settled the framework; enabled token-keyed typed props and Svelte-native motion  
_Cost:_ Later hit a Vite 8/rolldown + workerd incompatibility (downgraded to Vite 7)

**Why (AI).** Claude: the framework and motion agents landed here independently for Ben's exact reasons; Solid/Qwik use JSX, the thing he hates.
**Why (Ben).** Ben confirmed the settled stack ('Automerge sounds right' locked the rest; he raised no objection to Svelte).

---

## ADR-0012 · Substrate: Automerge (CRDT) over Jazz
**2026-06-05** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of the local-first sync/versioning substrate, facing Automerge vs. Jazz, chose Automerge over Jazz to get git-style content-addressed branching history (fork_at(version)) that exceeds Google Docs and is built for writers, accepting more assembly/wiring on Cloudflare (vs. Jazz's near-zero plumbing).

**Context.** Claude framed the one genuine remaining decision as the CRDT/sync substrate: Automerge (assembled) vs. Jazz (unified).

**Options.**
  - ✓ **Automerge + automerge-repo + R2** — Branch-from-any-version is the signature feature; the more 'go all the way' choice; binds cleanly to the editor
  - ✗ **Jazz** — Most 'inherent' DX but alpha, no native CF adapter, and weaker branching — would trade away the killer feature
  - ✗ **Zero/ElectricSQL/Instant/Triplit/Convex/PowerSync/Yjs** — Surveyed in the sync-engine shootout; not chosen

**Consequences.**  
_Good:_ Enabled the branching feature; local-first means the editor runs with zero server first  
_Cost:_ More assembly: hand-built sync/storage on Cloudflare; automerge WASM/cbor-x bundling constraints surfaced repeatedly

**Why (AI).** Claude leaned Automerge: git-branching history is distinctive and clearly wanted; the more go-all-the-way choice.
**Why (Ben).** "Automerge sounds right."

---

## ADR-0013 · Editor: raw ProseMirror over Tiptap
**2026-06-06** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of the editor implementation, facing Tiptap vs. raw ProseMirror, chose raw ProseMirror over Tiptap because the Automerge binding owns the schema (Tiptap would fight it and bundle unwanted chrome), to fit the grain, accepting that the one Tiptap feature the spec leaned on (static publish render) is covered by DOMSerializer over the same schema.

**Context.** While wiring the Automerge–ProseMirror binding, Claude found Tiptap fought the binding (which owns the schema).

**Options.**
  - ✓ **Raw ProseMirror bound to Automerge** — The Automerge binding owns the schema; raw PM fits the grain; DOMSerializer covers publish render
  - ✗ **Tiptap v3 (headless, on ProseMirror)** — Would fight the binding and bundle chrome Ben doesn't want

**Consequences.**  
_Good:_ Spec updated; editor is the first @bw/ui component on a shared Prose measure

**Why (AI).** Claude: 'Flagging, not asking — but say the word if you'd have kept Tiptap.'
**Why (Ben).** Not captured (Ben did not object; this was flagged for endorsement rather than asked).

**↔ Reversal / supersession.** Reverses the spec's editor choice (Tiptap/ProseMirror → raw ProseMirror).

---

## ADR-0014 · Monorepo + package layout (pnpm workspace)
**2026-06-06** · _benstone-writer_ · `ai-default-human-wavedthrough`

**Decision.** In the context of code organization, facing single-app vs. monorepo, chose a pnpm monorepo with packages/{schema,data,ui} + apps/web (SvelteKit) + workers/api (sync) over a flat app, to separate concerns (one data door, one design system, a shared schema) and enforce package boundaries, accepting monorepo tooling overhead.

**Context.** Across the buildout the project took a pnpm-monorepo shape with dedicated packages.

**Options.**
  - ✓ **pnpm monorepo with schema/data/ui packages + app + sync worker** — Enables package-boundary enforcement; one design-token source; shared contract
  - ✗ **Single flat app** — Couldn't structurally enforce the data/UI boundaries

**Consequences.**  
_Good:_ Package boundaries became lint-enforceable; @bw/api later converted to a DO library re-exported by the app  
_Cost:_ Vite optimizer + cross-package automerge resolution friction

**Why (AI).** Claude seeded @bw/ui/@bw/data/@bw/schema as the structural homes for the design system, data door, and contract.
**Why (Ben).** Not captured (Ben endorsed the principles that imply it; layout itself was not explicitly debated).

---

## ADR-0015 · Cloud sync: one Durable Object per document as a RELAY (not a hub) + R2
**2026-06-06** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of real-time cloud sync, facing hub vs. relay topology, chose a Durable Object per document acting as a relay (introduces peers to each other, forwards frames by address) with a side Repo over R2 for storage, over a pure server-Repo hub, to make real-time broadcast survive hibernation, accepting a more involved relay protocol port from mergeparty.

**Context.** Building cloud sync, Claude discovered a single server Repo never broadcasts cross-peer and that a hibernated DO only knows the waking peer.

**Options.**
  - ✓ **DO-per-doc relay (mergeparty model) + R2 storage adapter** — A hub Repo never broadcasts cross-peer and a woken Repo only knows the sender; relay survives hibernation
  - ✗ **Pure server-Repo hub** — Never proactively pushes to idle peers; failed the live-sync test

**Consequences.**  
_Good:_ Real-time bidirectional sync proven across isolated clients; recorded in §8.1  
_Cost:_ Required extensive debugging (framing bug, peer announce)

**Why (AI).** Claude: clients learn about each other and sync peer-to-peer through the relay (a stateless socket-forward robust to hibernation), while a side Repo handles durable R2 storage.
**Why (Ben).** Ben chose to build cloud sync next and warned against hand-waving ('the trap is just say durable object boom'); the relay mechanism itself was AI-derived.

**↔ Reversal / supersession.** Reverses the spec's implied hub design — the build revealed the DO must be a relay.

---

## ADR-0016 · Publish via DOMSerializer over the editor's own schema; zero-JS SSR reader
**2026-06-06** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of publishing and reading, facing two renderers vs. one, chose to render the Automerge body to static HTML via DOMSerializer over the editor's own schema and SSR the reader with zero editor/CRDT JS (an SSR-safe @bw/ui/reader subpath) over a separate reader pipeline, to make read and write identical and ship no editor JS to readers, accepting an extra package subpath to enforce the boundary.

**Context.** Building the public half, Claude implemented publish and the reader plane.

**Options.**
  - ✓ **One renderer (DOMSerializer over the same schema) + zero-JS SSR reader via /reader subpath** — Published essay identical to what was written; reader proven to load no ProseMirror/Automerge
  - ✗ **Separate reader renderer / reader pulls the editor barrel** — Two renderers; barrel drags in Editor→ProseMirror

**Consequences.**  
_Good:_ 'reading and writing are the same column' proven; bundle-verified zero editor JS  
_Cost:_ csr=false was later dropped to allow live updates (a deliberate tradeoff)

**Why (AI).** Claude: DOMSerializer over the adapter's schema means one renderer, not two; the /reader subpath structurally prevents pulling the editor bundle.
**Why (Ben).** Ben chose publish+reader as the next feature; the single-renderer approach was AI-derived.

**↔ Reversal / supersession.** Initial csr=false fully-static reader was partially reversed to add live updates (kept SSR paint, added a tiny client).

---

## ADR-0017 · Open-source the whole site publicly → security posture
**2026-06-06** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of the entire codebase, facing private vs. public, chose to open-source the whole site publicly over keeping it private, to make the craft itself part of the portfolio, accepting that the full attack surface is readable and demands zero security-through-obscurity, no bypasses, secrets only in wrangler secret, and a secret-scanner in CI.

**Context.** Ben revealed the repo will be public, changing the security calculus.

**Options.**
  - ✓ **Public open-source repo with hardened posture** — Part of the flex; forces minimal bespoke security surface
  - ✗ **Private repo** — Loses the open-source demonstration

**Consequences.**  
_Good:_ Drove the auth decision toward minimal owned surface; gitleaks in CI  
_Cost:_ Constrains all future security choices

**Why (AI).** Claude: assume every check is readable and an attacker can point an LLM at the whole repo to enumerate weaknesses.
**Why (Ben).** "anyone's Claude will be able to read the entire attack surface."

---

## ADR-0018 · Auth: Cloudflare Access (edge gate) over Arctic+GitHub (later regretted)
**2026-06-06** · _benstone-writer_ · `human-override`

**Decision.** In the context of authenticating a single owner on a public repo, facing an edge gate vs. a self-hosted library, chose Cloudflare Access (auth lives in CF config, app only verifies a signed JWT, ~40 owned lines) over Arctic+'Sign in with GitHub' (Claude's pick) and over better-auth/Auth.js (both had verified CVEs/bugs), to keep zero owned auth code, accepting worse UX/DX and a redirect-based (not in-place) login — a choice Ben later signaled he'd abandon.

**Context.** After agent research, Claude recommended Arctic+GitHub; Ben chose Cloudflare Access instead.

**Options.**
  - ✓ **Cloudflare Access (edge gate)** — Zero owned auth code, gate is config not source, free, no secrets in repo
  - ✗ **Arctic + Sign in with GitHub, opaque session in D1** — Claude's recommendation; thematically right + fits inline-edit, but Ben chose Access
  - ✗ **better-auth** — Young, unaudited, critical account-takeover CVE Oct 2025
  - ✗ **Auth.js on Workers** — Open OAuth-callback bug; examples mostly on Pages
  - ✗ **Clerk / Auth0 (managed)** — Overkill/lock-in for one user; Clerk is for SaaS
  - ✗ **Passkeys / Face-Touch ID** — Confirmed over-engineered for single-admin

**Consequences.**  
_Good:_ Minimal owned surface; gate verified both ways (jose JWKS, fail-closed); deployed working  
_Cost:_ Ben: 'I fucking hate cloudflare access... one of the worst uis of all time'; later decided to ditch it

**Why (AI).** Claude leaned Arctic+GitHub for the inline-edit UX; agreed Access is defensible (strongest posture for a public repo) once Ben chose it.
**Why (Ben).** "Cloudflare access I've used and it works" — chosen for minimal surface; but Ben later: "we'll ditch cloudflare access."

**↔ Reversal / supersession.** Reverses spec §13 (passkeys) AND Claude's Arctic+GitHub recommendation; itself slated for reversal — Ben said he'll ditch Cloudflare Access.

---

## ADR-0019 · CI runs lint + typecheck + tests + build + gitleaks, fails loud
**2026-06-06** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of merge safety, facing whether CI enforces quality, chose GitHub Actions running lint → typecheck → unit tests → prod build → gitleaks on every push/PR over a build-only CI, to make any regression or leaked secret block merge loudly, accepting that all gates must stay green.

**Context.** Ben demanded CI run the tests and fail aggressively.

**Options.**
  - ✓ **CI: lint + typecheck + test + build + gitleaks, any red blocks merge** — Fail aggressively and loudly; secret-scan before public
  - ✗ **Build-only CI (lint a no-op)** — Audit found lint never ran; enforcement was vapor

**Consequences.**  
_Good:_ Lint step added; gitleaks before public; verified all commands pass locally

**Why (AI).** Claude: CI runs the same commands I run locally; verified they pass and fail loud on regression.
**Why (Ben).** "I hope the CICD is running the unit tests and set up to fail aggressively and loudly."

---

## ADR-0020 · Structural enforcement layer: ESLint import-boundaries + Stylelint tokens + typed-prop component library
**2026-06-06** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of enforcing Ben's UI principles, facing convention vs. structure, chose a three-guard enforcement layer — ESLint import-boundaries (one data door, no feature CSS), Stylelint token-only values, and token-keyed union prop types — over relying on convention, to make off-system UI impossible to write (fails CI/typecheck), accepting an upfront build of the component library and refactor of all feature CSS.

**Context.** An adversarial audit found the UI principles were convention-only (no lint layer existed); Ben said 'Go'.

**Options.**
  - ✓ **ESLint boundaries + Stylelint + typed token-keyed props + component library** — Converts §11.1/11.2/11.3/11.7 from convention to 'the build won't let you'; structure beats behavior
  - ✗ **Convention-only (commit messages claim 'structural')** — Audit: 'I described intent as if it were the mechanism' — enforcement was vapor

**Consequences.**  
_Good:_ Each rule proven by planting a violation; features became zero-CSS pure composition; caught a real box-sizing mobile-overflow bug  
_Cost:_ The earlier 'structural' claims were honestly false until this was built

**Why (AI).** Claude: component props as token-keyed unions so a feature cannot even express a raw value (TS rejects it); ESLint bans <style> in features via the Svelte AST.
**Why (Ben).** Ben demanded the audit and then 'Go' on building the enforcement layer; structure-beats-behavior is his core principle.

---

## ADR-0021 · Typed RPC as a define-once contract, not a framework (one /api/rpc/[verb] door)
**2026-06-06** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of the imperative side-effect API, facing an RPC framework vs. a hand-fit contract, chose a define-once typed contract in @bw/schema + a generic /api/rpc/[verb] dispatch + thin typed client over oRPC/tRPC, to deliver define-once + zod-at-ingress + end-to-end typing for a 2-verb surface with zero new deps, accepting that a framework would have been over-machinery.

**Context.** Closing audit gaps, Claude designed the typed server contract for the ~2 imperative verbs.

**Options.**
  - ✓ **Define-once contract in @bw/schema + generic dispatch endpoint + typed client** — 2 verbs in a local-first app; a framework violates KISS; same §14 guarantee, zero deps
  - ✗ **oRPC / tRPC framework** — Over-machinery for 2 verbs
  - ✗ **Hand-rolled WebSocket JSON-RPC** — The trap Ben explicitly flagged

**Consequences.**  
_Good:_ publish/unpublish + FeedEvent union typed once; zod rejects bad input (400); proven end-to-end

**Why (AI).** Claude: for a 2-verb surface where everything else is local Automerge, the right tool is a define-once typed contract + thin client.
**Why (Ben).** Aligns with Ben's 'what would Google do / write the contract once' and 'don't hand-roll the protocol.'

---

## ADR-0022 · Deploy as ONE Cloudflare Worker via build-time DO export-merge
**2026-06-06** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of deployment topology, facing one Worker vs. split (SvelteKit + separate DO worker), chose one Worker (SvelteKit + SyncDocDO + ReaderFeedDO + D1/R2/KV) via a build-time export-merge that grafts DO named exports onto the adapter's _worker.js over a split deploy, to keep one origin/config/migration list (so the WS upgrade carries the Access cookie same-origin), accepting a build-merge step and a dev-only sidecar (getPlatformProxy can't run a same-Worker DO).

**Context.** Research established adapter-cloudflare v7 has no native DO export; the unified-Worker shape needs a build-time merge.

**Options.**
  - ✓ **One Worker via export-merge + dev sidecar** — Same-origin Access cookie; one deploy/config/migration; automerge blast radius contained by esbuild-separate bundle; prod is genuinely unified
  - ✗ **Split: SvelteKit Worker + DO worker via service binding** — Service bindings do carry WS, so same-origin isn't the reason — but two deploys, two configs, version skew, and you still need the dev sidecar

**Consequences.**  
_Good:_ Single deploy; verified with wrangler deploy --dry-run and local wrangler dev (5MB/1.4MB gzip under limit)  
_Cost:_ Build-merge step is a real tax; dev DX is a two-process dance with a dev-only WS port split

**Why (AI).** Research agent + Claude: the split's one advantage (isolating automerge) is already achieved within one Worker via esbuild-separate bundling; one Worker is the right call.
**Why (Ben).** Ben authorized deploy and said 'make sure the full thing works locally and then you are authorized to deploy the entire thing'; topology was AI/agent-derived.

---

## ADR-0023 · Backing stores: D1 (publish index) + R2 (doc blobs) + KV; ReaderFeedDO replaces in-process feed
**2026-06-06** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of production persistence, facing dev stand-ins vs. real bindings, chose D1 for the published-post index, R2 for Automerge doc blobs, KV, and a ReaderFeedDO (replacing the in-process feed) over the fs/in-process dev stores, to make publish/feed survive multi-isolate prod, accepting graceful binding-absent fallbacks so vite dev still degrades cleanly.

**Context.** For deploy, the dev stand-ins (fs JSON publish store, in-process SSE hub) needed real Cloudflare bindings.

**Options.**
  - ✓ **D1 + R2 + KV + ReaderFeedDO with binding-aware fallback** — Dev stores die on multi-isolate prod; binding-aware code keeps vite dev working
  - ✗ **Keep node:fs JSON store + in-process feed** — node:fs can't enter the Worker; in-process feed dies across isolates

**Consequences.**  
_Good:_ D1 round-trip + SSE proven locally and in prod; D1/KV provisioned (R2 needed Ben's 1-click enable)  
_Cost:_ Required relocating/abstracting the publish store to async

**Why (AI).** Claude: async D1-backed store with empty fallback when no binding, so no node:fs enters the Worker and vite dev degrades gracefully.
**Why (Ben).** Ben authorized the deploy and the real-bindings work.

**↔ Reversal / supersession.** Replaces the dev stand-ins (fs publish store, in-process SSE hub) the spec always intended to swap at deploy.

---

## ADR-0024 · Single-headed append-only version log with HEAD vs LIVE pointers (kill branching)
**2026-06-07T05:13** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of a writer's tool (not a dev tool), facing a confusing branch/fork/checkout model, chose one linear append-only version log with two orthogonal refs — HEAD (editing tip) and LIVE (publish pointer) — over branching, to make 'what I edit' vs 'what the world sees' unmistakable, accepting that this is a curated projection over Automerge's underlying change DAG.

**Context.** Round one implemented a developer-style branching model (forks, branch names, checkout-style history) over Automerge. Ben tore into it as the wrong mental model for a writer and described — in mixed git/Google-Docs terms — what he actually wanted.

**Options.**
  - ✗ **Branching / fork / checkout model (round one)** — imported a developer mental model onto a writer's tool; cloning whole Automerge docs per branch; bad UX even though logically sound
  - ✓ **Linear log + HEAD/LIVE pointers + roll-forward restore** — matches Google Docs / Figma; strictly less code than branching; teaches the model via two pointers

**Consequences.**  
_Good:_ Less code than branching (no doc cloning); Clear HEAD-vs-LIVE duality; Automerge survives; only the UX layer is torn out  
_Cost:_ No branches ever (a conscious simplification; Ink & Switch Patchwork argues branches are valuable); Requires curating the DAG into a linear projection

**Why (AI).** Claude restated Ben's model in correct terms (append-only log, HEAD authoring tip, LIVE publish ref, restore = roll-forward not roll-back, monotonic vN tags) and confirmed it is 'strictly simpler and better than what I built,' and is less code.
**Why (Ben).** Ben: the branch UI is 'still bad ui'; 'there is no need for the notion of branch names to exist in this app'; wants Google Docs' unified history instead.

**↔ Reversal / supersession.** Reverses the round-one branching/fork version model.

---

## ADR-0025 · Permanent monotonic vN release tags, server-authoritative in D1
**2026-06-07T05:13** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of labeling published versions, facing the need for stable monotonic release numbers a CRDT cannot provide, chose to assign vN server-side in D1 (counter via MAX+1, reuse on re-publish) over storing it in the Automerge doc, to guarantee strict monotonicity, accepting that publishing requires a server round-trip.

**Context.** Ben wants every version that becomes live to get a permanent number (v1, v2…) assigned in publish order, kept even if LIVE later moves away and returns. Research found no writing tool offers this (Figma names mutate, Google caps named versions at 40, Ghost at 10).

**Options.**
  - ✗ **Store vN / counter inside the Automerge CRDT** — a CRDT cannot produce a strict monotonic counter — two concurrent 'first-publish'es would both mint the same number
  - ✓ **Server-authoritative counter in D1 (sidecar)** — D1 already holds published_posts; serialized server decision guarantees monotonicity; separation of concerns (publish/ops state, not content)

**Consequences.**  
_Good:_ Stable publish-order labels independent of edit order; Reuse-or-assign verified against real D1 (re-publishing an old version reuses its vN)  
_Cost:_ vN/LIVE live outside the CRDT, so offline publish needs server reconciliation; Fills a genuine gap no off-the-shelf tool provides — must build it

**Why (AI).** Claude: 'A CRDT genuinely can't give a strict monotonic counter… Server-authoritative numbering, where D1 already sits.'
**Why (Ben).** Ben specified the permanence/monotonic-by-publish-order behavior; the server-side implementation was Claude's recommendation he endorsed.

---

## ADR-0026 · Collapse to ONE surface — kill /studio and the nameplate /
**2026-06-07T05:13** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of editor-is-the-viewer publishing UX, facing duplicated page-sets that violate DRY, chose one surface that changes mode per-user (/ = owner-aware index, /{essay} = read-mode for visitors / edit-in-place for owner) over a separate /studio plane, to make read and edit two views of one entity, accepting that the public/private 'two planes' becomes a plumbing-only distinction not a UI one.

**Context.** Round one built two UI surfaces (/writing and /studio, plus /writing/id and /studio/id) for the public reader and private editor — two lists of the same essays, two editor entrances. Ben identified this as the root UX failure and a DRY violation.

**Options.**
  - ✗ **Separate /studio + duplicate /writing surfaces (round one, prescribed by §11.6)** — two UIs for one entity; violates DRY; undiscoverable login; the round-one spec contradicted itself (§11.5 said inline edit, §11.6 prescribed studio)
  - ✓ **One mode-switching surface** — matches §11.5 'read and edit are two views of one entity'; minimal-friction idea→publish

**Consequences.**  
_Good:_ Big DRY win (one list, one editor surface); Friction-zero idea→publish, the product thesis  
_Cost:_ Required deleting working round-one routes

**Why (AI).** Claude after-action: 'The root error… I built the spec's two planes as two UI surfaces. They were never a UI concern. Two planes is a plumbing distinction.'
**Why (Ben).** Ben: 'I didn't want there to be a separate studio I should be writing and editing inline with the public website'; '/writing and /studio are the same thing… it violates DRY.'

**↔ Reversal / supersession.** Reverses round one's §11.6 separate-studio architecture.

---

## ADR-0027 · GitHub OAuth via Arctic + jose signed cookie; gate on immutable numeric id
**2026-06-07T05:35** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of a single-admin gate on workerd in a public repo, facing fragile/heavy auth frameworks, chose Arctic 3.7 (OAuth handshake) + jose HS256 __Host- cookie gating on the immutable numeric GitHub id (57852724) over Auth.js, better-auth, or hand-rolled OAuth, to delegate all crypto/handshake to vetted libs (~3 security-critical owned lines), accepting a stateless cookie's only revocation is secret rotation.

**Context.** Replacing Access required choosing an auth library and session mechanism for SvelteKit-on-Workers, on a public repo, for a single admin. A vigorous research agent compared options and Claude then verified the load-bearing facts first-hand.

**Options.**
  - ✓ **Arctic + jose** — runtime-agnostic on Workers; Arctic survived Lucia's deprecation; jose already in stack; smallest vetted surface
  - ✗ **Auth.js / @auth/sveltekit** — verified OPEN bug on SvelteKit+Workers (#11999), version-fragile, drags in unneeded provider/session machinery
  - ✗ **better-auth** — full session+DB framework; recent workerd regression (#6613); heavy for one user
  - ✗ **Hand-rolled OAuth handshake** — Ben was burned before; sharp edges (state, token exchange) better delegated to Arctic

**Consequences.**  
_Good:_ ~3 owned security-critical lines; all crypto delegated; Gate on immutable numeric id (renames can't impersonate); Stateless = no KV read on hot path  
_Cost:_ Cannot revoke a single cookie before exp without rotating the secret (logs Ben out everywhere); GitHub User-Agent and SameSite=Lax traps must be handled

**Why (AI).** Claude, after interrogating the agent and verifying first-hand: 'Arctic for the handshake + jose for a stateless signed session cookie… gated on your immutable numeric GitHub id… token discarded the instant we've checked it's you.'
**Why (Ben).** Ben asked for GitHub login pinned to his account and 'don't rush… think ahead about how you Claude will be able to test the auth flow yourself'; endorsed the approach.

---

## ADR-0028 · 'Saved' means durable in the cloud (R2), not local — honest cross-device durability
**2026-06-07T06:44** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of the save indicator, facing a misleading local-write signal, chose 'Saved' = the cloud (DO→R2) has durably persisted the content (Saving / Saved / Offline) over a local-write meaning, to honestly tell the user it's safe to close the tab, accepting a real cloud round-trip per save (targeted sub-second, faster than Google).

**Context.** Claude initially argued local-first makes saves instant and the indicator could reflect the local write. Ben furiously corrected that the indicator must reflect cloud durability, like Google's 'Saved to Drive,' and demanded it be faster than Google.

**Options.**
  - ✗ **Indicator reflects the synchronous local Automerge write** — Ben: that's 'LYING TO THE FUCKING USER'; the point is cloud backup
  - ✓ **Indicator reflects durable cloud persistence (R2 ack)** — matches Google's 'Saved to Drive'; honest about durability

**Consequences.**  
_Good:_ Honest durability signal (Ben's #1 value); Edge round-trip ~tens of ms vs Google's 0.5–2s (measured ~33ms warm floor)  
_Cost:_ Must never show a false 'Saved'; ties the indicator to real sync acks (later a source of bugs)

**Why (AI).** Claude initially mis-framed it ('local-first makes Saved instant'), was corrected, and adopted: '"Saved" means durable in the cloud — the DO acks after it persists your change to R2.'
**Why (Ben).** Ben: the status 'IS FOR THE ROUNDTRIP TO THE FUCKING CLOUD SERVER… If it isn't saved to the cloud it should say saving or offline.'

**↔ Reversal / supersession.** Reverses Claude's earlier local-first 'Saved is instant' framing.

---

## ADR-0029 · Identity is a UUID; the unix path IS the URL; no slugs anywhere
**2026-06-07T06:49** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of addressing essays, facing slug-based duplication, chose the immutable UUID as the only identity and the literal unix path /documents/{uuid} as the URL over editable title-derived slugs, to give one address per entity (internal == public) and uphold path-addressing, accepting non-human-readable URLs 'at least for now.'

**Context.** Round one keyed the published projection by slug (raw D1 SQL), giving each essay two addresses (documents/{id} and published/{slug}) and going around the path API. Claude initially proposed deriving an editable slug from the title; Ben rejected it hard.

**Options.**
  - ✗ **Editable title-derived slug in the URL/DB** — Ben: 'you make a fucking editable title the id of an item that is stupid, we use uuids' — identity must be stable/unique
  - ✓ **UUID path as the URL, no slugs** — one canonical address; honors §11.1 'the document's path is its URL'; no slug machinery

**Consequences.**  
_Good:_ Single canonical address per essay; Path-addressing restored as an invariant  
_Cost:_ URLs are non-human-readable UUIDs (accepted for now); Required removing slug from URL, DB, RPC contract, tests

**Why (AI).** Claude verified first-hand that the published projection bypassed the path API ('two seams betray it'), then proposed slugs and was overruled.
**Why (Ben).** Ben: 'I don't want slugs… For now I only want the unix path to exist everywhere including in the url.'

**↔ Reversal / supersession.** Reverses round one's slug-keyed published projection (§11.6 introduced slugs against §11.1).

---

## ADR-0030 · Git identity: machine-wide default flipped to personal, work scoped by remote
**2026-06-07T22:32** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of git authorship across ~139 repos, facing the work email as the global default, chose to flip the global default to personal (bstone100 noreply) and scope work identity by REMOTE (hasconfig rules for fullspeedautomation Bitbucket + Abi-ltd GitHub) over scoping by directory, because work repos are scattered on disk, accepting that history rewrites changed commit SHAs on the personal repos.

**Context.** All benstone-writer commits were authored under Ben's work email (benfsa) because the repo inherited the global git default. ~139 repos on the machine mostly resolved to the work email.

**Options.**
  - ✗ **Scope by directory (includeIf gitdir)** — work repos are scattered across ~/, not in one tree
  - ✓ **Scope work by remote (hasconfig remote.*.url), personal as default** — robust to location; 0 mismatches across all ~139 repos after a full sweep

**Consequences.**  
_Good:_ Personal repos correctly attributed to bstone100; work repos untouched; New repos default personal; can't recur in personal-projects  
_Cost:_ History rewrite changed SHAs on 5 personal repos (fine since solo); Used the private GitHub noreply, replacing real emails in history

**Why (AI).** Claude mapped the full blast radius, rewrote+force-pushed the personal repos, and installed the remote-based routing after confirming URL formats.
**Why (Ben).** Ben (angrily): commits were under his work account on his personal work; he wanted personal as default with work as the exception.

---

## ADR-0031 · Tag-gated CI/CD: deploy fires ONLY on a pushed v* semver tag
**2026-06-07T23:10** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of shipping to prod, facing the risk of accidental deploys, chose a deploy.yml that runs all gates (lint/typecheck/test/build/secret-scan) and deploys only when a v* tag is pushed over deploying on branch pushes, so commits/pushes ship nothing and deploy requires an explicit tag, accepting that Claude must ask permission before each tag.

**Context.** Ben wanted controlled deploys to benstone.me. benstone-site already used a tag-gated wrangler-action pattern.

**Options.**
  - ✗ **Deploy on push to main** — Ben wants deploy to be a deliberate, gated act
  - ✓ **Tag-gated deploy on v*** — every deploy passes the full gate; explicit and reversible up to the tag

**Consequences.**  
_Good:_ Push freely (ships nothing); deploy is a conscious tag; All gates run before any deploy  
_Cost:_ Slightly more ceremony to release; The deploy step itself required several fixes (see below)

**Why (AI).** Claude built it mirroring benstone-site's pattern; this decision was codified into CLAUDE.md (push freely, only v* tags need a nod).
**Why (Ben).** Ben: 'the only way to deploy a new version of the site should be by tagging a commit with a semver and pushing it… ask my permission first before deploying.'

---

## ADR-0032 · Cut benstone.me over from benstone-site (Pages) to the benstone-writer Worker
**2026-06-07T23:54** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of the production domain, facing benstone.me pointing at the old Pages site, chose to move apex+www onto the benstone-writer Worker — first via Worker routes on the existing proxied DNS (token lacked DNS:Edit), then converted to proper Custom Domains once Ben added DNS:Edit — over leaving Pages live, accepting brief downtime during the swap and a temporary routes-based approach.

**Context.** benstone.me was served by the older benstone-site Cloudflare Pages project; Ben wanted the new Worker there ('what is currently sitting there sux').

**Options.**
  - ✗ **Worker Custom Domain immediately** — blocked initially — the cfut token couldn't edit raw DNS to clear the Pages records
  - ✓ **Worker routes on existing proxied DNS (interim)** — works without DNS:Edit; declared in wrangler.jsonc to persist
  - ✓ **Proper Custom Domains (final)** — Cloudflare-managed DNS+cert; cleaner; done after DNS:Edit added

**Consequences.**  
_Good:_ benstone.me live on the new Worker with managed TLS; Config made declarative so deploys keep it  
_Cost:_ Brief downtime during the swap; Interim routes-on-dangling-CNAME state before the Custom Domain conversion

**Why (AI).** Claude mapped DNS state, used routes when DNS:Edit was missing, then converted to Custom Domains with effectively zero downtime once permitted.
**Why (Ben).** Ben: 'I give you permission to do whatever you got to do to swap the domain… because what is currently sitting there sux.'

**↔ Reversal / supersession.** Supersedes benstone-site as the thing served at benstone.me.

---

## ADR-0033 · MAJOR REVERSAL — abandon local-first/browser-as-truth for cloud-authoritative architecture
**2026-06-08T07:05** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of a cloud-native online-first blog (the corrected thesis), facing five cross-device failures all stemming from 'the browser is the source of truth' (the local-first model that rode in with Automerge), chose to reverse to server/Cloudflare-authoritative — the document's Durable Object is the live authority, clients pull authoritative state before showing anything, the save indicator reflects the authority's ack, and version history is server-authoritative — over the local-first model, to meet the Google-Docs always-in-sync bar, accepting a rewrite of the sync/catalog/save/history spine.

**Context.** Ben tested across devices: drafts made on his Mac never appeared on his phone, History differed per device, opening a doc on a fresh device showed empty content stuck on 'Saving…'. He diagnosed the whole app was architected incorrectly and reframed it as a cloud-native (not local-first) blog. Claude traced all symptoms to one root decision.

**Options.**
  - ✗ **Local-first / browser-as-truth (Automerge worldview)** — wrong thesis (offline isn't the point); causes per-browser drafts, divergent history, empty-doc-on-open, permanently-stuck/lying 'Saved'; the worldview was 'imported on a package.json line'
  - ✓ **Cloud-authoritative: DO-as-authority + server catalog + honest status** — matches Google Docs/Figma/Cloudflare's per-doc-coordinator pattern; fixes all five symptoms at the root; correct for an online-first blog

**Consequences.**  
_Good:_ One root fix resolves all five cross-device symptoms; Honest cross-device 'Saved'; same catalog/history everywhere; Aligns with the industry-standard per-doc DO pattern  
_Cost:_ Requires rewriting the sync/catalog/save/history spine (the shell is kept); Must exorcise the local-first worldview that kept creeping back

**Why (AI).** Claude owned it: 'this was built wrong at the foundation… the "Saved" lie… one root cause: sync was bolted on as a local-first afterthought instead of being the cloud-native spine'; and 'the local-first drift wasn't sloppiness, it was imported' (Automerge from Ink & Switch, who coined local-first).
**Why (Ben).** Ben: 'good software stays in sync all the time, like google docs… this is a cloud native app using all cloudflare services… NO SUNK COST FALLACY EVER… willing at any time to realize we did something wrong and completely rip it out.'

**↔ Reversal / supersession.** Reverses the foundational round-one/round-two decision that the browser is the source of truth (local-first). This is the central architectural reversal of the era.

---

## ADR-0034 · Server-authoritative documents catalog in D1; retire the browser registry
**2026-06-08T07:05** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of the document catalog, facing a browser-only list that doesn't cross devices, chose a server-authoritative documents table in D1 (id, title, status draft|live|down|trashed, timestamps) written by the editor on create/rename/publish/take-down/trash over finishing the local-first CRDT registry, because for a single-writer list the server must scan anyway, accepting that content stays local-first-ish (synced) while the catalog becomes server truth.

**Context.** The document catalog (the list of what exists) was a browser-local Automerge doc whose sync was never enabled — so drafts were per-browser and the server had no idea they existed (also blocking the purge cron). Content already syncs to R2; only the catalog was stranded.

**Options.**
  - ✗ **Finish the local-first registry (actually sync the CRDT catalog)** — doubling down on a CRDT for a single-writer list the server needs to scan; more complexity, no payoff
  - ✓ **Server-authoritative D1 documents table** — same catalog on every device, survives browser wipe; matches published_posts/doc_versions; gives trash + purge a home

**Consequences.**  
_Good:_ Catalog identical on every device; survives clearing site data; Trash + 30-day purge get a real home; kills the bolt-on trashed_docs table (just documents.status)  
_Cost:_ Editor must write D1 on lifecycle transitions; Retiring the registry is part of the spine rewrite

**Why (AI).** Claude: 'the catalog of your documents shouldn't be [browser-only]… a server-authoritative documents table in D1… Content stays local-first; the catalog becomes server truth. The browser registry gets retired — it's redundant and broken.'
**Why (Ben).** Ben: 'what do you mean a draft only lives client side, that's stupid' — and the cloud-native reframe.

**↔ Reversal / supersession.** Reverses the browser-local Automerge document registry (whose cross-device sync was never wired).

---

## ADR-0035 · Keep a clean swappable collaboration seam; the sync engine inside the DO stays open (Yjs leaning)
**2026-06-08T07:37** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of the in-DO collaboration engine, facing Automerge (CRDT) vs prosemirror-collab vs Yjs, chose to keep the engine behind a clean collaboration seam (document = connect/send/receive/snapshot) — leaning toward the paved path (Yjs-on-Durable-Objects / PartyKit) and away from Automerge — while explicitly leaving the final engine choice open, to stay multi-user-ready and swappable, accepting that the exact primitive is a deliberate decision deferred (not made in passing).

**Context.** With the DO as authority decided, the remaining question is the collaboration primitive inside it. Ben confirmed multi-user is 'definitely' on the table and stated his 'build the product, architect the platform' principle (design seams for the next step).

**Options.**
  - • **Automerge (CRDT)** — CRDT power (multi-user merge) mostly unused for one author; its heads/change-DAG machinery is the direct source of the history bugs; carries the local-first worldview
  - • **Yjs + DO (Cloudflare's paved path / PartyKit)** — mature ProseMirror CRDT; Cloudflare's paved path (they acquired PartyKit); de-risked; no local-first ideology
  - • **prosemirror-collab + DO authority (server step-rebasing)** — how Google Docs actually works; kills the CRDT-heads bug class; simpler for one author — but offline divergence is rebased not merged
  - ✗ **Build your own sync engine** — reinvention is the junior tell; 'right tool for the job', spend novelty higher up

**Consequences.**  
_Good:_ Engine is swappable; portable despite DO being proprietary; Multi-user/platform future fits the seam; Novelty budget moves to frontend + integration architecture  
_Cost:_ Final engine still undecided (explicitly open); DO is a proprietary primitive — must stay behind the seam to avoid lock-in smeared across the code

**Why (AI).** Claude: 'Durable-Object-as-authority, multi-user-ready, behind a clean seam so a CRDT could slot in later'; and that the paved path (Yjs/PartyKit) is the senior 'integrate the right tools' move, not a portfolio compromise.
**Why (Ben).** Ben: multi-user is 'definitely' on the table; 'always think as if what we're building now is going to become a building block'; and the portfolio is about identifying the right tools, not reinventing the wheel.

**↔ Reversal / supersession.** Sets up replacing Automerge as the sync primitive (the engine that carried the rejected local-first worldview).

---

## ADR-0036 · PROCESS REVERSAL — abandon living/round architecture docs; adopt an append-only ADR + code-as-truth
**2026-06-08T08:42** · _benstone-writer_ · `strong-human-conviction`

**Decision.** In the context of grounding compacted sessions, facing architecture docs that rot and contradict, chose code-as-truth + an append-only ADR (the irreplaceable 'why', captured in-session) + agent-regenerated orientation on demand over maintaining a living current-truth architecture doc, because the 'what' lives in the code forever while the 'why' lives only in ephemeral chat (the real bottleneck), accepting that a pure-refactor decision leaves no structural footprint and must be captured by discipline.

**Context.** Round 1 and Round 2 docs accumulated contradictions, and a fresh session building on flawed premises was a recurring failure. The discussion landed on how serious companies (Google) handle this and what a doc even is when its primary reader is an AI.

**Options.**
  - ✗ **One big living/current-truth architecture doc** — a doc trying to be both history and current-state rots; Google deliberately keeps no living master doc
  - ✗ **Multiple round docs** — pile up contradictions across rounds (the exact pain experienced)
  - ✓ **Append-only ADR + code-as-truth + agent-regenerated current-state** — captures the irreplaceable why; current-state is a regenerable cache, not a source; matches Google's design-doc-as-snapshot + code-as-truth

**Consequences.**  
_Good:_ No doc accumulates contradictions; the why is durably captured; Compaction stops mattering — depend on durable artifacts (ADR, commits, code, tests), not the summary; Rejected-alternatives/reversals (the highest-value, most-lost category) get recorded  
_Cost:_ Pure-refactor decisions leave no structural footprint to auto-detect; Requires discipline to append decisions in-session

**Why (AI).** Claude: 'stop maintaining current-state prose at all — regenerate it — and spend all your discipline capturing decisions as they're made, because that's the only irreplaceable thing'; Google runs on code-as-truth + design-doc-as-snapshot, 'deliberately no living master doc.'
**Why (Ben).** Ben: 'there is really no point at all in maintaining a current truth architecture document, what actually matters is the decision records… one indefinitely long ADR document that gets appended to.'

**↔ Reversal / supersession.** Reverses the earlier ROUND-1/ROUND-2 master-document approach (and the living-doc idea floated minutes earlier in the same conversation).

---

## ADR-0037 · Rewrite the spine, keep the shell (surgical, not a full rewrite)
**2026-06-08T09:36** · _benstone-writer_ · `ai-recommended-human-endorsed`

**Decision.** In the context of the corrected architecture, facing rewrite-all vs modify, chose to rewrite the poisoned spine (local-first repo-as-truth, opt-in per-doc sync, client registry, save-status, history-sourcing) but keep the worldview-neutral shell (public reader, publish pipeline, D1 published table, RPC contract, reader feed, ProseMirror editor surface, component library + tokens + structural lint, auth gate, deploy pipeline) over a from-scratch rewrite, because rewriting correct code re-introduces already-fixed bugs (slower/riskier even in Claude-time), accepting that any shell piece too entangled with the local-first data API gets rewritten too.

**Context.** Ben asked whether to rewrite the whole app from scratch (cheap in Claude-time) or modify it. Claude pushed back on a full rewrite on forward-looking grounds.

**Options.**
  - ✗ **Full rewrite from scratch** — would reinvent working wheels and re-introduce paid-for bug fixes; no-sunk-cost ≠ throw away correct code
  - ✗ **Modify the spine in place** — leaves local-first assumptions latent → they keep drifting back
  - ✓ **Rewrite spine, keep shell (surgical)** — the poison is bounded; the shell is neutral and good; this is 'don't reinvent the wheel' applied to your own code

**Consequences.**  
_Good:_ Preserves correct, paid-for shell code; Cleanly excises the local-first spine without latent assumptions  
_Cost:_ Requires mapping the exact seam between poisoned spine and neutral shell (the migration)

**Why (AI).** Claude: 'no-sunk-cost says be willing to throw anything away; it doesn't say throw away things that are correct… full rewrite of the sync/catalog/save/history core; keep the shell and re-point its data source.'
**Why (Ben).** Ben raised that rewriting is trivial in Claude-time and invoked no-sunk-cost; endorsed the surgical framing implicitly by moving to plan the ADR first.

---
