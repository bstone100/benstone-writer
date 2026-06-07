import { subscribeFeed, FEED_DO_NAME } from "$lib/server/feed";
import type { FeedEvent } from "@bw/schema";
import type { RequestHandler } from "./$types";

/**
 * GET /api/feed — Server-Sent Events stream for the public reader (§7 #5).
 * One-way server→reader push; readers update in place (no reload/poll). Public
 * (emits only "post published: {id}", nothing sensitive). At deploy this is
 * served by ReaderFeedDO; in dev by the in-process hub.
 */
export const GET: RequestHandler = ({ request, platform }) => {
  // Production: the ReaderFeedDO holds the open reader streams across isolates.
  if (platform?.env?.READER_FEED) {
    const ns = platform.env.READER_FEED;
    return ns.get(ns.idFromName(FEED_DO_NAME)).fetch(request);
  }
  // Fallback (plain `vite dev`, no bindings): the in-process hub.
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let keepalive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* stream closed */
        }
      };
      send(": connected\n\n");
      unsubscribe = subscribeFeed((event: FeedEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });
      // Comment ping so idle proxies don't drop the connection.
      keepalive = setInterval(() => send(": ping\n\n"), 25_000);
    },
    cancel() {
      unsubscribe?.();
      if (keepalive) clearInterval(keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    },
  });
};
