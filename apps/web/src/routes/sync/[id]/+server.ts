import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * GET /sync/{id} — the WebSocket upgrade for Automerge sync (§8.1, §14.1.D).
 * Owner-only (authoring); forwarded to that document's SyncDocDO via the binding,
 * returning the DO's 101 + webSocket. This is an ENDPOINT-ONLY route (no sibling
 * +page), so SvelteKit passes the 101 through untouched. One origin ⇒ our session
 * cookie rides the WS upgrade; the owner is verified here via locals.owner (set by
 * hooks) BEFORE forwarding to the DO (ROUND-2 §R3).
 */
export const GET: RequestHandler = ({ params, request, locals, platform }) => {
  if (!locals.owner) throw error(401, "unauthorized");
  if (request.headers.get("upgrade") !== "websocket") throw error(426, "expected a websocket upgrade");
  if (!platform) throw error(500, "sync requires the Worker runtime");
  const ns = platform.env.SYNC_DOC;
  return ns.get(ns.idFromName(params.id)).fetch(request);
};
