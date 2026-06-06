import { describe, it, expect } from "vitest";
import { emitFeed, subscribeFeed } from "./feed";

// Integration: the in-process reader-feed hub (§7 #5) — the dev stand-in for
// ReaderFeedDO. Proves the publish→reader live-update path at the pub/sub seam.
describe("reader feed — pub/sub", () => {
  it("delivers events to subscribers and stops after unsubscribe", () => {
    const got: unknown[] = [];
    const unsub = subscribeFeed((e) => got.push(e));

    emitFeed({ type: "published", slug: "a", updatedAt: 1 });
    emitFeed({ type: "unpublished", slug: "b" });
    unsub();
    emitFeed({ type: "published", slug: "c", updatedAt: 2 }); // after unsub → not seen

    expect(got).toEqual([
      { type: "published", slug: "a", updatedAt: 1 },
      { type: "unpublished", slug: "b" },
    ]);
  });

  it("isolates a throwing subscriber so others still receive the event", () => {
    const got: unknown[] = [];
    const unsubBad = subscribeFeed(() => {
      throw new Error("dead stream");
    });
    const unsubGood = subscribeFeed((e) => got.push(e));

    expect(() => emitFeed({ type: "unpublished", slug: "x" })).not.toThrow();
    expect(got).toEqual([{ type: "unpublished", slug: "x" }]);

    unsubBad();
    unsubGood();
  });
});
