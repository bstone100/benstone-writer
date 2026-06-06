// The Automerge WASM expects a `performance` global; the Workers runtime has
// one, but shim defensively BEFORE any automerge import is evaluated (§8.1).
const _g = globalThis as unknown as { performance?: { now(): number } };
_g.performance ??= { now: () => Date.now() };

import { DurableObject } from "cloudflare:workers";

export interface Env {
  SYNC_DOC: DurableObjectNamespace<SyncDocDO>;
  DOC_STORE: R2Bucket;
}

/**
 * SyncDocDO — one Durable Object per document (§8.1). Authoritative Automerge
 * peer + hibernatable-WebSocket hub. Holds a rebuildable in-memory Repo backed
 * by R2; hibernates between sync bursts.
 *
 * SKELETON: routing + lifecycle shell only. The hibernatable-WS NetworkAdapter,
 * the R2StorageAdapter, and the lazy Repo build land next (porting mergeparty),
 * once the verified blueprint is in hand.
 */
export class SyncDocDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket upgrade", { status: 426 });
    }
    return new Response("SyncDocDO: sync not yet implemented", { status: 501 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // TEMP probe: does the Automerge WASM initialize under workerd? Removed once
    // the real sync layer proves it transitively.
    if (url.pathname === "/_wasmcheck") {
      try {
        const A = await import("@automerge/automerge");
        let d = A.from<{ hello: string; n: number }>({ hello: "world", n: 1 });
        d = A.change(d, (doc) => {
          doc.n = 2;
        });
        return Response.json({ ok: true, heads: A.getHeads(d), n: A.toJS(d).n });
      } catch (e) {
        return Response.json(
          { ok: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined },
          { status: 500 },
        );
      }
    }

    // TEMP probe: exercise the R2StorageAdapter against the live R2 binding.
    if (url.pathname === "/_r2check") {
      const { R2StorageAdapter } = await import("./r2-storage-adapter");
      const a = new R2StorageAdapter(env.DOC_STORE);
      const enc = (s: string) => new TextEncoder().encode(s);
      const dec = (u?: Uint8Array) => (u ? new TextDecoder().decode(u) : null);
      await a.removeRange(["t"]); // clean slate
      await a.save(["t", "snapshot", "h1"], enc("alpha"));
      await a.save(["t", "incremental", "c1"], enc("beta"));
      await a.save(["t", "incremental", "c2"], enc("gamma"));
      const one = dec(await a.load(["t", "snapshot", "h1"]));
      const range = (await a.loadRange(["t"]))
        .map((c) => ({ key: c.key.join("/"), data: dec(c.data) }))
        .sort((x, y) => x.key.localeCompare(y.key));
      await a.remove(["t", "snapshot", "h1"]);
      const afterRemove = dec(await a.load(["t", "snapshot", "h1"]));
      const incrementalCount = (await a.loadRange(["t", "incremental"])).length;
      await a.removeRange(["t"]);
      const afterRemoveRange = (await a.loadRange(["t"])).length;
      return Response.json({
        one,
        range,
        afterRemove,
        incrementalCount,
        afterRemoveRange,
      });
    }

    const match = url.pathname.match(/^\/sync\/(.+)$/);
    if (!match) {
      return new Response("benstone-writer sync worker", { status: 200 });
    }
    const documentId = match[1];
    if (!documentId) return new Response("missing document id", { status: 400 });

    // One DO per document (§8.1): deterministic name → stable instance.
    const id = env.SYNC_DOC.idFromName(documentId);
    return env.SYNC_DOC.get(id).fetch(request);
  },
} satisfies ExportedHandler<Env>;
