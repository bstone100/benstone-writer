import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import type { Cookies } from "@sveltejs/kit";
import { signSession, verifySession } from "./session-core";

/**
 * The $env + cookie glue over the pure `session-core`. Two cookies:
 *  • the SESSION — proof the owner is logged in (a signed JWT of their GitHub id);
 *  • the one-time OAuth STATE — CSRF protection across the GitHub round-trip.
 *
 * `__Host-` (prod) pins a cookie to this exact origin over HTTPS only — the
 * strongest scoping — but it REQUIRES `Secure`, which `http://localhost` can't
 * set, so dev drops the prefix. `SameSite=Lax` (NOT Strict) is mandatory: the
 * callback is a top-level GET navigation FROM github.com, and Strict would
 * withhold the state cookie there, breaking every login.
 */
const SESSION_COOKIE = dev ? "session" : "__Host-session";
const STATE_COOKIE = dev ? "oauth_state" : "__Host-oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const STATE_TTL_SECONDS = 60 * 10; // 10 minutes

function sessionSecret(): string {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

const base = { path: "/" as const, httpOnly: true, secure: !dev, sameSite: "lax" as const };

export async function setSessionCookie(cookies: Cookies, githubId: string): Promise<void> {
  const token = await signSession(githubId, sessionSecret(), SESSION_TTL_SECONDS);
  cookies.set(SESSION_COOKIE, token, { ...base, maxAge: SESSION_TTL_SECONDS });
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

/** The verified GitHub id carried by the session cookie, or null. */
export async function readSessionId(cookies: Cookies): Promise<string | null> {
  const token = cookies.get(SESSION_COOKIE);
  return token ? await verifySession(token, sessionSecret()) : null;
}

export function setStateCookie(cookies: Cookies, state: string): void {
  cookies.set(STATE_COOKIE, state, { ...base, maxAge: STATE_TTL_SECONDS });
}

/** Read AND clear the one-time OAuth state cookie (used once, on callback). */
export function takeStateCookie(cookies: Cookies): string | undefined {
  const state = cookies.get(STATE_COOKIE);
  cookies.delete(STATE_COOKIE, { path: "/" });
  return state;
}
