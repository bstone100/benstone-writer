import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * placeholder — show prompt text when the document is empty, as a CSS `::before`
 * on the empty first paragraph (see Editor's `.is-empty[data-placeholder]`
 * rule). A node decoration, never real content: nothing is written to the
 * Automerge doc, so an untouched document stays genuinely empty.
 *
 * This is the kind of small bespoke ProseMirror plugin that replaces a Tiptap
 * extension — raw PM, full control, no schema bridge.
 */
export function placeholder(text: string): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc } = state;
        const empty =
          doc.childCount === 1 &&
          doc.firstChild != null &&
          doc.firstChild.isTextblock &&
          doc.firstChild.content.size === 0;
        if (!empty) return null;
        return DecorationSet.create(doc, [
          Decoration.node(0, doc.firstChild!.nodeSize, {
            class: "is-empty",
            "data-placeholder": text,
          }),
        ]);
      },
    },
  });
}
