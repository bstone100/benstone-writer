import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorState } from "prosemirror-state";

/**
 * Focus mode (§16.3) — dim every top-level block except the one the caret is in,
 * so the sentence you're writing is the only bright thing. A node decoration adds
 * `.is-active` to the active block; the dimming is pure CSS (opacity only →
 * compositor-friendly, 120fps) gated by a `focus-mode` class the Editor toggles.
 * Decorations map through transactions for free, so this survives the Automerge
 * binding's reconciliation (unlike a cached position). The decoration is always
 * present; only the CSS gate decides whether it's visible.
 */
export function activeBlockRange(state: EditorState): { from: number; to: number } | null {
  const { $from } = state.selection;
  if ($from.depth === 0) return null;
  return { from: $from.before(1), to: $from.after(1) }; // the top-level ancestor block
}

export function focusPlugin(): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        const range = activeBlockRange(state);
        if (!range) return null;
        return DecorationSet.create(state.doc, [
          Decoration.node(range.from, range.to, { class: "is-active" }),
        ]);
      },
    },
  });
}
