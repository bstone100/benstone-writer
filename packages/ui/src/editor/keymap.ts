import { toggleMark, chainCommands, exitCode } from "prosemirror-commands";
import { splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { undo, redo } from "prosemirror-history";
import type { Schema } from "prosemirror-model";
import type { Command } from "prosemirror-state";

/**
 * Editor keymap (§16.3) — invisible-editor formatting + list editing by keyboard,
 * no toolbar. Built over the binding's basic schema; each binding registers only
 * if its mark/node exists. Returns a map for `keymap(...)`, placed BEFORE
 * baseKeymap so list Enter/Tab take precedence (the list commands no-op outside a
 * list, so baseKeymap still handles the normal case).
 */
export function buildKeymap(schema: Schema): Record<string, Command> {
  const keys: Record<string, Command> = {};
  const bind = (key: string, cmd: Command) => (keys[key] = cmd);

  // History (the editor previously bound these inline; centralized here).
  bind("Mod-z", undo);
  bind("Shift-Mod-z", redo);
  bind("Mod-y", redo);

  const { strong, em, code } = schema.marks;
  if (strong) {
    bind("Mod-b", toggleMark(strong));
    bind("Mod-B", toggleMark(strong));
  }
  if (em) {
    bind("Mod-i", toggleMark(em));
    bind("Mod-I", toggleMark(em));
  }
  if (code) bind("Mod-`", toggleMark(code));

  const { list_item, hard_break } = schema.nodes;
  if (list_item) {
    bind("Enter", splitListItem(list_item));
    bind("Tab", sinkListItem(list_item));
    bind("Shift-Tab", liftListItem(list_item));
  }

  // Shift-Enter → hard break (and break out of a code block).
  if (hard_break) {
    const br = hard_break;
    const cmd: Command = chainCommands(exitCode, (state, dispatch) => {
      if (dispatch) dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
      return true;
    });
    bind("Shift-Enter", cmd);
    bind("Mod-Enter", cmd);
  }

  return keys;
}
