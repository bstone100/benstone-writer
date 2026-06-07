import { error, redirect } from "@sveltejs/kit";
import { OAuth2RequestError } from "arctic";
import { createGitHub, fetchGitHubUserId } from "$lib/server/github";
import { takeStateCookie, setSessionCookie } from "$lib/server/session";
import { verifyState, isOwnerId } from "$lib/server/session-core";
import { OWNER_GITHUB_ID } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

/**
 * GET /auth/callback — finish the handshake. Verify the CSRF state, exchange the
 * code for a token (Arctic), read the caller's GitHub id, and — ONLY if it's the
 * owner — mint the session cookie. Anyone else is refused and NO session is set.
 */
export const GET: RequestHandler = async (event) => {
  const { url, cookies } = event;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = takeStateCookie(cookies); // one-time: read + clear

  if (!code || !verifyState(expected, state)) throw error(400, "invalid OAuth state");

  let githubId: string;
  try {
    const tokens = await createGitHub(event).validateAuthorizationCode(code);
    githubId = await fetchGitHubUserId(tokens.accessToken());
  } catch (e) {
    throw error(400, e instanceof OAuth2RequestError ? `OAuth error: ${e.code}` : "OAuth exchange failed");
  }

  if (!isOwnerId(githubId, OWNER_GITHUB_ID)) throw error(403, "not authorized");

  await setSessionCookie(cookies, githubId);
  throw redirect(302, "/");
};
