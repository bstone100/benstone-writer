import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  emDash,
  ellipsis,
  InputRule,
} from "prosemirror-inputrules";
import type { Schema } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";

/**
 * Markdown-as-you-type (§16.3, the "invisible" editor) — the lowest-friction way
 * to structure prose: you just type, and the shortcut becomes the block. Hand-
 * rolled over the binding's basic schema (raw PM, per placeholder.ts's
 * precedent), guarded so a rule only registers if its node exists in the schema.
 *
 *   "# " "## " "### " → headings        "> " → blockquote
 *   "- " / "* " / "+ " → bullet list      "1. " → ordered list
 *   "``` "             → code block       "---" → horizontal rule
 *   plus smart quotes, em-dash, ellipsis.
 */
export function buildInputRules(schema: Schema): Plugin {
  const rules = [...smartQuotes, emDash, ellipsis];
  const { heading, blockquote, code_block, bullet_list, ordered_list, horizontal_rule } = schema.nodes;

  if (blockquote) rules.push(wrappingInputRule(/^\s*>\s$/, blockquote));

  if (bullet_list) rules.push(wrappingInputRule(/^\s*([-+*])\s$/, bullet_list));

  if (ordered_list) {
    rules.push(
      wrappingInputRule(
        /^(\d+)\.\s$/,
        ordered_list,
        (match) => ({ order: Number(match[1]) }),
        (match, node) => node.childCount + (node.attrs.order as number) === Number(match[1]),
      ),
    );
  }

  if (code_block) rules.push(textblockTypeInputRule(/^```$/, code_block));

  if (heading) {
    rules.push(textblockTypeInputRule(/^(#{1,3})\s$/, heading, (match) => ({ level: match[1].length })));
  }

  if (horizontal_rule) {
    rules.push(
      new InputRule(/^(?:---|___|\*\*\*)$/, (state, _match, start, end) => {
        const tr = state.tr.replaceRangeWith(start, end, horizontal_rule.create());
        // Land the caret in the block after the rule (PM inserts a trailing one).
        return tr;
      }),
    );
  }

  return inputRules({ rules });
}
