import { redirect, error, type Handle } from "@sveltejs/kit";
import { isOwner } from "$lib/server/access";

// The private surface (§11.6). Everything else — the public reading plane — is
// open by default. Structure beats per-route checks: one gate, public-by-default.
function isPrivate(pathname: string): boolean {
  return pathname.startsWith("/studio") || pathname.startsWith("/api/publish");
}

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.owner = await isOwner(event);

  if (isPrivate(event.url.pathname) && !event.locals.owner) {
    // In prod the Cloudflare Access edge has already redirected non-owners to the
    // login; this is the defense-in-depth fallback (and the dev behaviour).
    if (event.url.pathname.startsWith("/api/")) throw error(401, "unauthorized");
    throw redirect(303, "/");
  }

  return resolve(event);
};
