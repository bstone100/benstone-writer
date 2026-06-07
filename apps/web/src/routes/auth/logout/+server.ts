import { redirect } from "@sveltejs/kit";
import { clearSessionCookie } from "$lib/server/session";
import type { RequestHandler } from "./$types";

/**
 * POST /auth/logout — clear the session and return to the public site. POST (not
 * GET) so a stray <img>/link can't force a CSRF logout; the Log Out control is a
 * form button (ROUND-2 §R3, wired in step 3).
 */
export const POST: RequestHandler = (event) => {
  clearSessionCookie(event.cookies);
  throw redirect(302, "/");
};
