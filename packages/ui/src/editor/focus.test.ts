import { describe, it, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { basicSchemaAdapter } from "@automerge/prosemirror";
import { activeBlockRange } from "./focus";

const schema = basicSchemaAdapter.schema;

function threeParagraphs(): EditorState {
  const p = (t: string) => schema.node("paragraph", null, [schema.text(t)]);
  return EditorState.create({ schema, doc: schema.node("doc", null, [p("one"), p("two"), p("three")]) });
}

describe("activeBlockRange — the caret's top-level block (§16.3)", () => {
  it("wraps exactly the block the caret is in", () => {
    let s = threeParagraphs();
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 6))); // inside "two"
    const r = activeBlockRange(s);
    expect(r).not.toBeNull();
    expect(s.doc.nodeAt(r!.from)?.textContent).toBe("two");
  });
});
