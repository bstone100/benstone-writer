import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { RequestEvent } from "@sveltejs/kit";
import { decideOwner } from "./access-policy";

/**
 * Cloudflare Access verification (§13) — the ONLY auth code we own.
 *
 * In production the Access edge gates the private surface BEFORE a request
 * reaches this app and forwards a signed assertion. We re-verify it here so a
 * leaked origin URL still can't get in (defense-in-depth), and confirm it's the
 * owner. The login UI, identity provider, sessions, and the allow-list policy
 * all live in Cloudflare config — NOT in this repo and NOT as secrets we hold.
 *
 * Required prod env (non-secret → Cloudflare `[vars]`; see docs/AUTH.md):
 *   ACCESS_TEAM_DOMAIN  e.g. https://benstone.cloudflareaccess.com
 *   ACCESS_AUD          the Access application's Audience (AUD) tag
 *   OWNER_EMAIL         the single allow-listed identity
 */
const TEAM_DOMAIN = env.ACCESS_TEAM_DOMAIN;
const AUD = env.ACCESS_AUD;
const OWNER_EMAIL = env.OWNER_EMAIL;

let _jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
function jwks() {
  // Lazily created so dev (which never verifies a JWT) makes no network call.
  _jwks ??= createRemoteJWKSet(new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`));
  return _jwks;
}

/** The cryptographically-verified email from the Access assertion, or null. */
async function accessOwnerEmail(event: RequestEvent): Promise<string | null> {
  if (!TEAM_DOMAIN || !AUD) return null; // not configured → no assertion to trust
  const token =
    event.request.headers.get("cf-access-jwt-assertion") ??
    event.cookies.get("CF_Authorization");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwks(), {
      issuer: TEAM_DOMAIN,
      audience: AUD,
    });
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

/**
 * isOwner(event) — is this request the site owner?
 *  • prod: a verified Access assertion whose email === OWNER_EMAIL (fail-closed).
 *  • dev:  localhost is your own machine, not a public boundary, so it's you.
 *    `dev` is compile-time false in every production build, and prod is gated by
 *    the Cloudflare Access EDGE regardless — so this is not a production bypass.
 */
export async function isOwner(event: RequestEvent): Promise<boolean> {
  return decideOwner(await accessOwnerEmail(event), OWNER_EMAIL, dev);
}
