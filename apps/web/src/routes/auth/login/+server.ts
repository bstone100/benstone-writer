import { redirect } from "@sveltejs/kit";
import { generateState } from "arctic";
import { createGitHub } from "$lib/server/github";
import { setStateCookie } from "$lib/server/session";
import type { RequestHandler } from "./$types";

/**
 * GET /auth/login — start the GitHub OAuth handshake. Generate a CSRF state,
 * stash it in a one-time cookie, and redirect to GitHub's consent screen. We
 * request NO scopes: the public numeric id is all the owner gate needs.
 */
export const GET: RequestHandler = (event) => {
  const state = generateState();
  setStateCookie(event.cookies, state);
  const url = createGitHub(event).createAuthorizationURL(state, []);
  throw redirect(302, url.toString());
};
