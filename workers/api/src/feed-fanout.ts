/**
 * Fan a frame out to every SSE writer WITHOUT awaiting any of them. A
 * backpressured or half-open stream's `write()` can pend indefinitely; awaiting
 * each write sequentially (the original ReaderFeedDO.notify code) let ONE stuck
 * reader hang the whole fan-out — and therefore the publish RPC that calls it, so
 * `makeLive`'s HTTP response never returned and the editor's crown/vN stayed stale
 * until the history panel was reopened (reproduced on prod). Fire-and-forget
 * instead: live readers still receive the frame, dead ones reject → pruned, a slow
 * one just buffers. Kept dependency-free (no `cloudflare:workers`) so it's testable.
 */
export function fanOut(
  writers: Set<WritableStreamDefaultWriter<Uint8Array>>,
  frame: Uint8Array,
): void {
  for (const w of [...writers]) {
    void w.write(frame).catch(() => writers.delete(w));
  }
}
