import { describe, it, expect } from "vitest";
import type { VersionMeta } from "@bw/schema";
import { toMs, groupChanges, SESSION_GAP_MS, mergeTimeline, type HistoryEntry } from "./history";

describe("toMs — Automerge change-time normalization", () => {
  it("scales seconds to ms", () => expect(toMs(1_700_000_000)).toBe(1_700_000_000_000));
  it("leaves ms untouched", () => expect(toMs(1_700_000_000_000)).toBe(1_700_000_000_000));
});

describe("groupChanges — fold the change DAG into edit-sessions (§8)", () => {
  const base = 1_700_000_000_000;
  const min = 60_000;

  it("returns nothing for no changes", () => {
    expect(groupChanges([])).toEqual([]);
  });

  it("folds changes within the idle gap into one session (heads = latest)", () => {
    const sessions = groupChanges([
      { hash: "a", time: base },
      { hash: "b", time: base + min },
      { hash: "c", time: base + 2 * min },
    ]);
    expect(sessions).toEqual([{ heads: ["c"], time: base + 2 * min, changeCount: 3 }]);
  });

  it("splits a new session after an idle gap", () => {
    const sessions = groupChanges([
      { hash: "a", time: base },
      { hash: "b", time: base + SESSION_GAP_MS + 1 },
    ]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ heads: ["a"], changeCount: 1 });
    expect(sessions[1]).toMatchObject({ heads: ["b"], changeCount: 1 });
  });

  it("normalizes seconds-valued change times", () => {
    expect(groupChanges([{ hash: "a", time: 1_700_000_000 }])[0]?.time).toBe(1_700_000_000_000);
  });
});

describe("mergeTimeline — local sessions + server versions (§8, R5)", () => {
  const base = 1_700_000_000_000;
  const min = 60_000;
  const session = (heads: string[], time: number, changeCount = 1): HistoryEntry => ({ heads, time, changeCount });
  const version = (heads: string[], version: number | null, createdAt: number, name: string | null = null): VersionMeta => ({ heads, version, name, createdAt });

  it("REGRESSION: a live version whose heads is NOT a local session tip still gets a row (crown)", () => {
    // The exact prod bug: published at "b", then kept typing so "b" folded into a
    // session's interior — "b" is no longer any session's tip. It must STILL appear.
    const sessions = [session(["a"], base, 1), session(["c"], base + 5 * min, 3)];
    const rows = mergeTimeline(sessions, [version(["b"], 1, base + 2 * min)], ["b"]);

    const liveRow = rows.find((r) => r.heads.join() === "b");
    expect(liveRow).toBeDefined(); // ← before the fix this row did not exist
    expect(liveRow).toMatchObject({ live: true, version: 1, changeCount: null });
    expect(rows).toHaveLength(3); // a, b, c — none dropped
    // Newest first by time: c (base+5m), b (base+2m), a (base).
    expect(rows.map((r) => r.heads[0])).toEqual(["c", "b", "a"]);
    // Exactly one crown, on the live version.
    expect(rows.filter((r) => r.live)).toHaveLength(1);
  });

  it("dedups a version that still coincides with a session, carrying its vN/name onto that row", () => {
    const sessions = [session(["a"], base, 1), session(["c"], base + 5 * min, 2)];
    const rows = mergeTimeline(sessions, [version(["c"], 2, base + 5 * min, "Final")], ["c"]);
    expect(rows).toHaveLength(2); // not 3 — "c" is one row
    const c = rows.find((r) => r.heads[0] === "c")!;
    expect(c).toMatchObject({ version: 2, name: "Final", live: true, changeCount: 2, current: true });
  });

  it("marks the newest local session as the current draft; versions are never current", () => {
    const sessions = [session(["a"], base, 1), session(["c"], base + 5 * min, 1)];
    const rows = mergeTimeline(sessions, [version(["b"], 1, base + 2 * min)], null);
    expect(rows.find((r) => r.heads[0] === "c")!.current).toBe(true);
    expect(rows.find((r) => r.heads[0] === "a")!.current).toBe(false);
    expect(rows.find((r) => r.heads[0] === "b")!.current).toBe(false);
    expect(rows.every((r) => !r.live)).toBe(true); // no liveHeads → no crown
  });

  it("handles no sessions (server-only versions) and no versions (local-only) cleanly", () => {
    expect(mergeTimeline([], [version(["b"], 1, base)], ["b"])).toMatchObject([{ heads: ["b"], live: true, changeCount: null }]);
    const localOnly = mergeTimeline([session(["a"], base, 2)], [], null);
    expect(localOnly).toMatchObject([{ heads: ["a"], changeCount: 2, current: true, version: null }]);
  });
});
