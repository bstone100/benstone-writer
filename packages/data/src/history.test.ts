import { describe, it, expect } from "vitest";
import { toMs, groupChanges, SESSION_GAP_MS } from "./history";

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
