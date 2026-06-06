import { setBlockType, wrapIn } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import type { EditorState, Command } from "prosemirror-state";
import type { Schema } from "prosemirror-model";

/**
 * Slash menu (§11.8 SlashMenu) — type "/" in an empty paragraph to insert/convert
 * a block. State is PURE-derived from the doc + selection (no input-event
 * tracking, no persisted plugin state), so it survives the Automerge binding's
 * re-reconciliation for free and is trivially testable. The "/query" lives in the
 * doc only momentarily; choosing an item deletes it and applies the transform.
 */
export type SlashState = { from: number; to: number; query: string } | null;

/** Open when the caret's paragraph is exactly "/<query>" (no whitespace). */
export function slashState(state: EditorState): SlashState {
  const { selection } = state;
  if (!selection.empty) return null;
  const $from = selection.$from;
  const parent = $from.parent;
  if (!parent.isTextblock || parent.type.name !== "paragraph") return null;
  const text = parent.textContent;
  if (!text.startsWith("/") || /\s/.test(text)) return null;
  const from = $from.start();
  return { from, to: from + text.length, query: text.slice(1) };
}

export type SlashItem = {
  id: string;
  label: string;
  hint: string;
  keywords: string[];
  command: (schema: Schema) => Command;
};

const insertHr =
  (schema: Schema): Command =>
  (state, dispatch) => {
    const hr = schema.nodes.horizontal_rule;
    if (!hr) return false;
    if (dispatch) dispatch(state.tr.replaceSelectionWith(hr.create()).scrollIntoView());
    return true;
  };

/** The fixed insert/convert menu (the inventory is the contract, §11.8). */
export const SLASH_ITEMS: SlashItem[] = [
  { id: "h1", label: "Heading 1", hint: "#", keywords: ["title", "h1"], command: (s) => setBlockType(s.nodes.heading, { level: 1 }) },
  { id: "h2", label: "Heading 2", hint: "##", keywords: ["h2", "subtitle"], command: (s) => setBlockType(s.nodes.heading, { level: 2 }) },
  { id: "h3", label: "Heading 3", hint: "###", keywords: ["h3", "subheading"], command: (s) => setBlockType(s.nodes.heading, { level: 3 }) },
  { id: "ul", label: "Bullet list", hint: "-", keywords: ["bullet", "unordered", "list"], command: (s) => wrapInList(s.nodes.bullet_list) },
  { id: "ol", label: "Numbered list", hint: "1.", keywords: ["ordered", "numbered", "list"], command: (s) => wrapInList(s.nodes.ordered_list) },
  { id: "quote", label: "Quote", hint: ">", keywords: ["blockquote", "quote"], command: (s) => wrapIn(s.nodes.blockquote) },
  { id: "code", label: "Code block", hint: "```", keywords: ["code", "pre", "snippet"], command: (s) => setBlockType(s.nodes.code_block) },
  { id: "hr", label: "Divider", hint: "---", keywords: ["divider", "rule", "horizontal", "hr"], command: insertHr },
];

/** Filter the menu by the slash query (label + keyword substring). */
export function filterSlash(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (i) => i.label.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q)),
  );
}
