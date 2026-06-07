# Auth — GitHub OAuth (single-admin gate)

The whole site is open-source and public, so the posture is unchanged from round
one: **own as little auth code as possible**, and authenticate **exactly one
identity — Ben — and nobody else.** Round two replaces Cloudflare Access (whose
dashboard UX was unbearable) with **GitHub OAuth**. The full design and the
first-hand verification (the User-Agent trap, the no-bypass test strategy) live in
**[`ROUND-2.md`](../ROUND-2.md) §4.3–§4.4**; this file is the operational summary.

## The shape

- **Handshake:** [Arctic](https://arcticjs.dev) drives the OAuth handshake — we
  never hand-roll it. `/auth/login` → GitHub consent → `/auth/callback`.
- **Session:** a [jose](https://github.com/panva/jose)-signed **HS256 JWT** in a
  `__Host-session` cookie carrying the GitHub **numeric id**. The signing key
  (`SESSION_SECRET`) is the trust root.
- **Gate:** `isOwner(event)` = the verified session id equals `OWNER_GITHUB_ID`
  (`57852724` — Ben; public, in code, never the mutable username). One gate in
  `hooks.server.ts` over the private surface; everything else public-by-default.
- **Owned code:** `lib/server/{session-core,session,github,auth}.ts`. The
  security-critical crypto is the pure, `$env`-free `session-core.ts`
  (unit-tested in `session-core.test.ts`). No identity provider, session store, or
  user system to own.

## What's gated

| Surface | Gated? | How |
|---|---|---|
| `/`, `/documents/{uuid}` (read) | No — public, cacheable, zero-JS | — |
| `/api/rpc/*`, `/sync/{id}` | Yes | `hooks.server.ts` → `locals.owner` |
| `/api/me` (owner probe) | No — returns `{owner:false}` to visitors | reads `locals.owner` |
| `/auth/*` | No — it *is* the login | — |

## Cookies (the traps, recorded)

- `SameSite=Lax`, **not Strict** — the callback is a top-level GET *from*
  github.com; Strict would withhold the state cookie there and break every login.
- `__Host-` prefix in prod (origin-pinned, HTTPS-only); dropped in dev because
  `http://localhost` can't set `Secure`.
- The `/user` call to `api.github.com` **must** send a `User-Agent` (verified: 403
  without it). Arctic sets its own on the token exchange; ours is explicit in
  `github.ts`.

## Setup at deploy (Ben creates one GitHub OAuth App)

1. github.com → Settings → Developer settings → **OAuth Apps → New**:
   - Homepage `https://benstone-writer.bstone100.workers.dev`
   - Callback `https://benstone-writer.bstone100.workers.dev/auth/callback`
2. Secrets (never committed):
   - `wrangler secret put SESSION_SECRET` — a long random string
   - `wrangler secret put GITHUB_CLIENT_SECRET` — from the OAuth App
   - `GITHUB_CLIENT_ID` is **not** secret (Worker `[vars]` or a secret, either way).
3. CI secret-scan (gitleaks) stays; no auth secret ever lands in the repo.

## Local dev & testing (no production bypass)

`vite dev` reads `.env`; `wrangler dev` reads `.dev.vars` (both gitignored, each
with a local `SESSION_SECRET`). The **real** GitHub handshake is tested against the
**deployed** app (its one callback URL) — driven via a real browser. Everything
*behind* auth is tested by **minting a dev session** with the local secret —
`node apps/web/scripts/mint-session.mjs` — which only the secret-holder can do and
which no app route exposes. There is **no** dev-only or prod login bypass.
