# Auth — Cloudflare Access (single-admin gate)

The whole site is open-source and public, so the security posture is: **own as
little auth code as possible.** Authentication is **Cloudflare Access** at the
edge — the login UI, identity provider, sessions, and the allow-list policy live
in Cloudflare config, *not* in this repo and *not* as secrets we hold. The only
auth code we own is `apps/web/src/lib/server/access.ts` (~40 lines): it
re-verifies the edge's signed assertion as defense-in-depth and checks it's the
owner.

This decision (and why not passkeys / better-auth / Auth.js / Clerk) is recorded
in ARCHITECTURE §13.

## What's gated

| Surface | Gated? | How |
|---|---|---|
| `/`, `/writing`, `/writing/{slug}` | **No** (public, cacheable, zero-JS) | — |
| `/studio`, `/studio/*` | Yes | Access edge + `hooks.server.ts` |
| `POST /api/publish` | Yes | Access edge + `hooks.server.ts` + endpoint check |
| `GET /api/me` (owner probe) | No (returns `{owner:false}` for visitors) | reads verified identity |
| Sync WebSocket (`workers/api` `/sync/{id}`) | **Yes in prod (TODO at deploy)** | same-origin Access cookie on the upgrade |

`/api/me` is how the public, cacheable article page reveals an Edit control for
the owner without varying its HTML (§11.5): the page is identical for everyone;
the owner's browser calls `/api/me` after paint and enhances.

## Cloudflare setup (do this at deploy)

1. **Zero Trust → Access → Applications → Add → Self-hosted.**
   - Application domain(s): the production host, scoped to the private paths
     (e.g. `benstone.me/studio*`, `benstone.me/api/publish`, and the sync path).
     Leave `/writing*` and `/` **ungated**.
   - Identity provider: pick one that supports passkeys upstream if wanted
     (GitHub or Google one-click; one-time-PIN email also works).
   - **Policy:** Action **Allow**, Include → **Emails** → your email. That single
     rule is the entire "authenticate me and nobody else."
   - Note the application **AUD** (Audience) tag.
2. **Set Worker vars** (non-secret; `wrangler.jsonc` `[vars]` or dashboard):
   - `ACCESS_TEAM_DOMAIN` = `https://<your-team>.cloudflareaccess.com`
   - `ACCESS_AUD` = the application AUD tag
   - `OWNER_EMAIL` = your allow-listed email
   - The app fails **closed** if these are unset in prod (no assertion ⇒ not owner).
3. **Sync WebSocket gate:** once app + sync ship as one Worker (one origin), the
   WS upgrade carries the Access cookie; verify it in the Worker `fetch` before
   forwarding to the DO (see the SECURITY note in `workers/api/src/index.ts`).
   If sync stays a separate origin, mint a short-lived signed ticket from an
   authed endpoint and verify it on connect (Cloudflare's documented pattern).
4. **CI secret scanning** before the repo goes public (e.g. `gitleaks`), and
   confirm no secret (incl. the GitHub OAuth secret Cloudflare holds for you)
   ever lands in the repo. Nothing in this auth design requires a committed
   secret.

## Local dev

There is no Cloudflare edge in front of `vite dev`, so there's no assertion to
verify. `localhost` is your own machine, not a public boundary, so `isOwner`
returns `true` in dev (`dev` is compile-time **false** in every production
build, and prod is gated by the Access edge regardless — so this is not a
production bypass). The full edge flow is therefore verified at deploy, not in
local dev.
