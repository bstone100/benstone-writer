import "./shim"; // perf shim before automerge loads (transitively via sync-do).
import { SyncDocDO, type Env } from "./sync-do";

// The DO class must be exported from the Worker entry for the binding to find it.
export { SyncDocDO };

/**
 * benstone-writer sync Worker (§7/§8.1). Routes `/sync/{documentId}` to that
 * document's Durable Object (one DO per document). The DO does the WebSocket
 * upgrade and speaks the Automerge sync protocol.
 *
 * Auth at the upgrade (validate the session cookie before acceptWebSocket)
 * lands with passkeys (#6); for now the dev socket is open.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/sync\/([^/]+)$/);
    if (!match) {
      return new Response("benstone-writer sync worker", { status: 200 });
    }
    const documentId = match[1];
    if (!documentId) return new Response("missing document id", { status: 400 });

    // SECURITY (§13, deploy): in production this Worker is same-origin behind
    // Cloudflare Access, so the WS upgrade carries the Access assertion / the
    // CF_Authorization cookie — verify it here (owner only) BEFORE forwarding the
    // upgrade to the DO, and reject otherwise. Dev is localhost (no edge), so the
    // socket is open. See docs/AUTH.md. (Not yet wired — sync is dev-only today.)
    const id = env.SYNC_DOC.idFromName(documentId);
    return env.SYNC_DOC.get(id).fetch(request);
  },
} satisfies ExportedHandler<Env>;
