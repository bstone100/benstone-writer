import { redirect, error, type Handle } from "@sveltejs/kit";
import { isOwner } from "$lib/server/auth";

// The private surface. Everything else — the public reading plane — is open by
// default. Structure beats per-route checks: one gate, public-by-default. The
// owner is now a verified GitHub session (ROUND-2 §R3), not Cloudflare Access;
// the gate logic is unchanged. The only private surface now is the RPC verbs;
// /documents/{id} is a public route (its load 404s a draft for visitors) and the
// sync WebSocket self-gates on locals.owner.
function isPrivate(pathname: string): boolean {
  return pathname.startsWith("/api/rpc");
}

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.owner = await isOwner(event);

  if (isPrivate(event.url.pathname) && !event.locals.owner) {
    if (event.url.pathname.startsWith("/api/")) throw error(401, "unauthorized");
    throw redirect(303, "/");
  }

  return resolve(event);
};
