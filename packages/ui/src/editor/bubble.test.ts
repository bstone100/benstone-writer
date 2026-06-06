import { describe, it, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { basicSchemaAdapter } from "@automerge/prosemirror";
import { bubbleState, isMarkActive } from "./bubble";

// The bubble's logic is pure (selection → state), so it tests with a plain
// EditorState — no DOM, no view. This is the same schema the editor binds.
const schema = basicSchemaAdapter.schema;

function stateWith(text: string): EditorState {
  const doc = schema.node("doc", null, [schema.node("paragraph", null, text ? [schema.text(text)] : [])]);
  return EditorState.create({ schema, doc });
}

describe("bubbleState — selection-derived, pure (§11.8)", () => {
  it("is null for a collapsed selection", () => {
    expect(bubbleState(stateWith("hello world"))).toBeNull();
  });

  it("opens for a non-empty selection with all mark flags off", () => {
    let s = stateWith("hello world");
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 6))); // "hello"
    expect(bubbleState(s)).toEqual({ from: 1, to: 6, active: { strong: false, em: false, code: false } });
  });

  it("reflects a mark that is active across the selection", () => {
    let s = stateWith("hello world");
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 6)));
    s = s.apply(s.tr.addMark(1, 6, schema.marks.strong.create()));
    expect(bubbleState(s)?.active.strong).toBe(true);
    expect(isMarkActive(s, "em")).toBe(false);
  });
});
