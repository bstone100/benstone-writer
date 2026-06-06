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
