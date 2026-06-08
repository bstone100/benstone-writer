import { DurableObject } from "cloudflare:workers";
import type { FeedEvent } from "@bw/schema";
import { fanOut } from "./feed-fanout";

/**
 * ReaderFeedDO — the SSE fan-out for the public reader (§7 #5, §14.1.E). A
 * singleton DO (one instance, addressed by a fixed name) that holds every open
 * reader's event stream; `notify()` (called by the publish/unpublish RPC) writes
 * one SSE frame to all of them, so a (re)publish updates open readers IN PLACE —
 * never a reload, never a poll. Replaces the dev in-process hub (feed.ts) with
 * the same shape, now durable across isolates.
 *
 * No CRDT here — just streams + a Set — so it's a light class bundled alongside
 * SyncDocDO. `import type` keeps @bw/schema out of the runtime bundle.
 */
export class ReaderFeedDO extends DurableObject {
  private readonly writers = new Set<WritableStreamDefaultWriter<Uint8Array>>();
  private readonly encoder = new TextEncoder();

  /** Subscribe: returns a long-lived text/event-stream the reader holds open. */
  override async fetch(request: Request): Promise<Response> {
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    this.writers.add(writer);
    void writer.write(this.encoder.encode(": connected\n\n")).catch(() => {});

    // Prune promptly when the reader disconnects (the inbound request aborts).
    request.signal.addEventListener("abort", () => {
      this.writers.delete(writer);
      void writer.close().catch(() => {});
    });

    return new Response(readable, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        connection: "keep-alive",
      },
    });
  }

  /** Fan one event out to every open reader (RPC from the publish handler). */
  async notify(event: FeedEvent): Promise<void> {
    const frame = this.encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    fanOut(this.writers, frame);
  }
}
