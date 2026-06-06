import { describe, it, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { basicSchemaAdapter } from "@automerge/prosemirror";
import { slashState, filterSlash, SLASH_ITEMS } from "./slash";

const schema = basicSchemaAdapter.schema;

function stateWith(text: string): EditorState {
  const doc = schema.node("doc", null, [schema.node("paragraph", null, text ? [schema.text(text)] : [])]);
  const s = EditorState.create({ schema, doc });
  return s.apply(s.tr.setSelection(TextSelection.atEnd(s.doc))); // caret at end
}

describe("slashState — doc/selection-derived, pure (§11.8)", () => {
  it("is null for a normal paragraph", () => {
    expect(slashState(stateWith("hello"))).toBeNull();
  });
  it("opens for a '/' paragraph and exposes the query", () => {
    expect(slashState(stateWith("/"))).toMatchObject({ query: "" });
    expect(slashState(stateWith("/head"))).toMatchObject({ query: "head" });
  });
  it("closes once whitespace is typed (it's a literal '/ ' then)", () => {
    expect(slashState(stateWith("/head ing"))).toBeNull();
  });
});

describe("filterSlash — label + keyword substring", () => {
  it("returns all items for an empty query", () => {
    expect(filterSlash("")).toHaveLength(SLASH_ITEMS.length);
  });
  it("filters by label and keyword", () => {
    expect(filterSlash("quote").map((i) => i.id)).toEqual(["quote"]);
    expect(filterSlash("list").map((i) => i.id).sort()).toEqual(["ol", "ul"]);
    expect(filterSlash("head").map((i) => i.id)).toEqual(["h1", "h2", "h3"]);
  });
});
