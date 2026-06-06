import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/**
 * The ONE ProseMirror → Svelte seam (§11.4 IoC). ProseMirror plugin state isn't
 * reactive to Svelte, so this plugin's `view().update` — which PM calls after
 * EVERY applied transaction (local, remote, selection-only), correctly timed
 * post-apply/pre-paint — is where we read editor state and write the Svelte rune
 * the overlay renders from. `apply` stays pure; this is the only side-effect
 * site. The overlay is a pure function of what this writes.
 */
export function bridge(onUpdate: (view: EditorView) => void): Plugin {
  return new Plugin({
    view: (view) => {
      onUpdate(view); // initial
      return { update: (v) => onUpdate(v) };
    },
  });
}
