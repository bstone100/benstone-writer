import { describe, it, expect } from "vitest";
import { transitionKind, vtName } from "./motion";

describe("transitionKind — motion derived from the path relationship (§12)", () => {
  it("descends into a child (documents → documents/{id})", () => {
    expect(transitionKind(["documents"], ["documents", "a"])).toBe("descend");
    // multiple levels deeper is still a descent
    expect(transitionKind(["documents"], ["documents", "a", "branches", "b"])).toBe("descend");
    // root → collection
    expect(transitionKind([], ["documents"])).toBe("descend");
  });

  it("ascends back toward the root (documents/{id} → documents)", () => {
    expect(transitionKind(["documents", "a"], ["documents"])).toBe("ascend");
    expect(transitionKind(["documents", "a", "branches", "b"], ["documents", "a"])).toBe("ascend");
  });

  it("is lateral between siblings (documents/a → documents/b)", () => {
    expect(transitionKind(["documents", "a"], ["documents", "b"])).toBe("lateral");
    expect(transitionKind(["published", "x"], ["published", "y"])).toBe("lateral");
  });

  it("crossfades unrelated destinations (same depth, different parent)", () => {
    expect(transitionKind(["documents", "a"], ["published", "b"])).toBe("crossfade");
    // different depth, neither a prefix of the other
    expect(transitionKind(["documents", "a"], ["published", "b", "c"])).toBe("crossfade");
  });

  it("treats same-level paths as siblings — incl. top-level sections (shared root parent)", () => {
    // both are children of the root, so by the model they're siblings → lateral
    expect(transitionKind(["documents"], ["published"])).toBe("lateral");
  });

  it("is total — always returns one of the four kinds", () => {
    const paths = [[], ["documents"], ["documents", "a"], ["published", "x"], ["documents", "a", "b"]];
    for (const from of paths)
      for (const to of paths)
        expect(["descend", "ascend", "lateral", "crossfade"]).toContain(transitionKind(from, to));
  });
});

describe("vtName — a stable view-transition-name from a path (§12)", () => {
  it("derives a deterministic, ident-safe name", () => {
    expect(vtName(["documents", "abc"])).toBe("vt-documents-abc");
    expect(vtName(["published", "my-slug"])).toBe("vt-published-my-slug");
  });

  it("normalizes characters that aren't valid in a CSS custom-ident", () => {
    expect(vtName(["documents", "a/b c.d"])).toBe("vt-documents-a-b-c-d");
    // result contains only ident-safe chars
    expect(vtName(["x", "weird:%^"])).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("is stable: same path → same name (so it morphs across views)", () => {
    expect(vtName(["documents", "id1"])).toBe(vtName(["documents", "id1"]));
  });
});
