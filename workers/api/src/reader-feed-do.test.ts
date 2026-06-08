import { describe, it, expect } from "vitest";
import { fanOut } from "./feed-fanout";

type W = WritableStreamDefaultWriter<Uint8Array>;

/** A fake SSE writer that records writes and resolves/hangs/throws on demand. */
function mockWriter(behavior: "ok" | "hang" | "throw") {
  const writes: Uint8Array[] = [];
  return {
    writes,
    write(chunk: Uint8Array): Promise<void> {
      writes.push(chunk);
      if (behavior === "hang") return new Promise<void>(() => {}); // never settles
      if (behavior === "throw") return Promise.reject(new Error("dead stream"));
      return Promise.resolve();
    },
  };
}

describe("ReaderFeedDO fanOut — a stuck reader must NOT hang the fan-out (the makeLive-hang bug)", () => {
  it("reaches every writer (blocking on none), delivers to live, prunes dead", async () => {
    const live = mockWriter("ok");
    const stuck = mockWriter("hang"); // its write() never settles — the original `await` hung here
    const dead = mockWriter("throw");
    // Insertion order matters: `stuck` is BEFORE `dead`. With the old awaiting loop,
    // the iteration would block on `stuck` forever and never reach `dead`.
    const writers = new Set([live, stuck, dead] as unknown as W[]);
    const frame = new TextEncoder().encode("event: published\ndata: {}\n\n");

    fanOut(writers, frame); // returns synchronously — never awaits a write

    // Proof of non-blocking: the writer AFTER the stuck one still got its frame.
    expect(live.writes.length).toBe(1);
    expect(stuck.writes.length).toBe(1);
    expect(dead.writes.length).toBe(1);

    // The dead writer's rejected write prunes it; live + (still-pending) stuck remain.
    await Promise.resolve();
    await Promise.resolve();
    expect(writers.has(dead as unknown as W)).toBe(false);
    expect(writers.has(live as unknown as W)).toBe(true);
    expect(writers.has(stuck as unknown as W)).toBe(true);
  });
});
