import { GitHub } from "arctic";
import { env } from "$env/dynamic/private";
import type { RequestEvent } from "@sveltejs/kit";

/**
 * The GitHub OAuth handshake. Arctic owns it — we NEVER hand-roll OAuth. Arctic
 * sets its own `User-Agent` on the token exchange, so that call is workerd-safe;
 * the only request WE make is `/user` below, which MUST carry a `User-Agent`
 * (VERIFIED: api.github.com returns HTTP 403 without one — and Node's fetch adds
 * one for you, hiding the bug, while workerd sends none). `redirectURI` is derived
 * from the live origin so dev and prod each resolve their own correct callback.
 */
export function createGitHub(event: RequestEvent): GitHub {
  // `$env/dynamic/private` types these as `string | undefined`. Narrow to `string`
  // (and fail loudly if unset) — same contract as sessionSecret(). This also keeps
  // the typecheck honest in CI, where no secrets are present at `svelte-kit sync`.
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)");
  }
  return new GitHub(clientId, clientSecret, `${event.url.origin}/auth/callback`);
}

/** Exchange an access token for the caller's immutable GitHub numeric id. */
export async function fetchGitHubUserId(accessToken: string): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      "user-agent": "benstone-writer", // REQUIRED by api.github.com (verified 403 without)
      accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub /user request failed: ${res.status}`);
  const user = (await res.json()) as { id?: number };
  if (typeof user.id !== "number") throw new Error("GitHub /user returned no numeric id");
  return String(user.id);
}
