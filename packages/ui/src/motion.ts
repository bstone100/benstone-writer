import type { Path } from "@bw/schema";

/**
 * vtName(path) — a stable `view-transition-name` derived from an entity's PATH
 * (§12). The same datum sets the same name wherever it appears, so the browser
 * morphs it between views (list item ↔ open document, reader ↔ editor) — shared
 * element = identity, keyed by path, declared once, with no per-screen wiring.
 *
 * Pure + SSR-safe (no DOM), so it works on the zero-JS public reader too. A
 * view-transition-name must be a CSS <custom-ident>, so non-ident chars in the
 * path (e.g. an id's separators) are normalized.
 */
export function vtName(path: Path): string {
  return "vt-" + path.join("-").replace(/[^a-zA-Z0-9_-]/g, "-");
}

export type TransitionKind = "descend" | "ascend" | "lateral" | "crossfade";

function isPrefix(prefix: Path, of: Path): boolean {
  return prefix.length <= of.length && prefix.every((seg, i) => of[i] === seg);
}

/**
 * transitionKind(from, to) — THE derivation (§12): the motion is a function of
 * the two paths' relationship, not hand-authored per screen.
 *   • descend  — `to` is a child of `from` (documents → documents/{id}): a level
 *                deeper. The iOS push (child slides in over the parent).
 *   • ascend   — `to` is an ancestor of `from`: a level shallower. Push's inverse.
 *   • lateral  — same level, same parent (documents/a → documents/b): siblings.
 *   • crossfade— unrelated; no hierarchy/sibling relationship to encode.
 * Declare this once; every navigation that moves through the data tree gets the
 * transition that teaches where it went.
 */
export function transitionKind(from: Path, to: Path): TransitionKind {
  if (from.length === to.length) {
    return from.length > 0 && isPrefix(from.slice(0, -1), to) ? "lateral" : "crossfade";
  }
  if (isPrefix(from, to)) return "descend"; // into a child
  if (isPrefix(to, from)) return "ascend"; // back toward the root
  return "crossfade";
}
