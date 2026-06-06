import type { FeedEvent } from "@bw/schema";

/**
 * Reader-feed hub (§7 #5) — the dev stand-in for `ReaderFeedDO`. An in-process
 * pub/sub (on globalThis so it survives Vite HMR): the publish endpoint emits,
 * the SSE endpoint subscribes and streams to open readers. At deploy this swaps
 * to a Durable Object that fans out across isolates; the interface is the same.
 */
type Listener = (event: FeedEvent) => void;

const listeners: Set<Listener> = ((globalThis as { __bwFeed?: Set<Listener> }).__bwFeed ??=
  new Set());

export function emitFeed(event: FeedEvent): void {
  for (const l of [...listeners]) {
    try {
      l(event);
    } catch {
      /* a dead stream shouldn't break the rest */
    }
  }
}

export function subscribeFeed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The singleton ReaderFeedDO instance name (one global fan-out, §14.1.E). */
export const FEED_DO_NAME = "global";

/**
 * Emit a reader-feed event the way prod does: fan out through the ReaderFeedDO
 * when the binding is present (one DO, all isolates), else the in-process hub
 * (plain `vite dev`). The publish/unpublish RPC calls this; readers update in
 * place — never a reload/poll.
 */
export async function notifyFeed(env: App.Platform["env"] | undefined, event: FeedEvent): Promise<void> {
  if (env?.READER_FEED) {
    const ns = env.READER_FEED;
    await ns.get(ns.idFromName(FEED_DO_NAME)).notify(event);
  } else {
    emitFeed(event);
  }
}
