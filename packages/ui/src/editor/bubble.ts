import { toggleMark } from "prosemirror-commands";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { MarkType } from "prosemirror-model";

/**
 * Selection bubble (§11.8 SelectionBubble) — the inline-format toolbar of the
 * invisible editor. All state is PURE-derived from the editor selection (no
 * persisted plugin state, no doc writes), so it's trivially testable and can't
 * drift. The bridge calls bubbleState() each update; the overlay renders + floats.
 */
export type BubbleState = { from: number; to: number; active: Record<BubbleMark, boolean> } | null;

/**
 * Open the bubble for any non-empty selection (collapse hides it), carrying the
 * active-mark flags so the toggle highlights stay reactive even when the
 * selection range is unchanged (e.g. right after toggling bold).
 */
export function bubbleState(state: EditorState): BubbleState {
  const { from, to, empty } = state.selection;
  if (empty || from === to) return null;
  const active = {} as Record<BubbleMark, boolean>;
  for (const m of BUBBLE_MARKS) active[m] = isMarkActive(state, m);
  return { from, to, active };
}

/** Is `markType` active across the current selection (for toggle highlight)? */
export function markActive(state: EditorState, type: MarkType): boolean {
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks());
  return state.doc.rangeHasMark(from, to, type);
}

/** The marks the bubble offers, in order. */
export const BUBBLE_MARKS = ["strong", "em", "code"] as const;
export type BubbleMark = (typeof BUBBLE_MARKS)[number];

export function isMarkActive(state: EditorState, name: BubbleMark): boolean {
  const type = state.schema.marks[name];
  return type ? markActive(state, type) : false;
}

/** Toggle a mark by name on the live selection, keeping focus in the editor. */
export function toggleMarkByName(view: EditorView, name: BubbleMark): void {
  const type = view.state.schema.marks[name];
  if (!type) return;
  toggleMark(type)(view.state, view.dispatch);
  view.focus();
}
