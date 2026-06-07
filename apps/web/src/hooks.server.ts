import { redirect, error, type Handle } from "@sveltejs/kit";
import { isOwner } from "$lib/server/auth";

// The private surface. Everything else — the public reading plane — is open by
// default. Structure beats per-route checks: one gate, public-by-default. The
// owner is now a verified GitHub session (ROUND-2 §R3), not Cloudflare Access;
// the gate logic is unchanged. (/studio collapses into one surface in step 2.)
function isPrivate(pathname: string): boolean {
  return pathname.startsWith("/studio") || pathname.startsWith("/api/rpc");
}

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.owner = await isOwner(event);

  if (isPrivate(event.url.pathname) && !event.locals.owner) {
    if (event.url.pathname.startsWith("/api/")) throw error(401, "unauthorized");
    throw redirect(303, "/");
  }

  return resolve(event);
};
