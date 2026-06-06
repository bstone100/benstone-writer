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
