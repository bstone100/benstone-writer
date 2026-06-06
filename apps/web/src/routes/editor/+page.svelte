<script lang="ts">
  import { onMount } from "svelte";
  import { getHandle, createDocument } from "@bw/data";
  import { init } from "@automerge/prosemirror";
  import { EditorState } from "prosemirror-state";
  import { EditorView } from "prosemirror-view";
  import { keymap } from "prosemirror-keymap";
  import { baseKeymap } from "prosemirror-commands";
  import { history, undo, redo } from "prosemirror-history";

  let el: HTMLDivElement;
  let id = $state<string | null>(null);
  let status = $state("starting…");

  onMount(() => {
    let existing = localStorage.getItem("editor-doc");
    if (!existing) {
      existing = createDocument({ title: "Untitled" });
      localStorage.setItem("editor-doc", existing);
    }
    id = existing;
    let view: EditorView | undefined;
    let cancelled = false;

    getHandle(existing)
      .then(async (handle) => {
        await handle.whenReady();
        if (cancelled) return;
        const { schema, pmDoc, plugin } = init(handle, ["body"]);
        const state = EditorState.create({
          schema,
          doc: pmDoc,
          plugins: [
            history(),
            keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
            keymap(baseKeymap),
            plugin,
          ],
        });
        view = new EditorView(el, { state });
        status = "ready";
      })
      .catch((e) => {
        status = "error: " + (e?.message ?? String(e));
        console.error("[editor] init failed", e);
      });

    return () => {
      cancelled = true;
      view?.destroy();
    };
  });
</script>

<main>
  <h1>editor lab</h1>
  <p>doc <code>{id ?? "…"}</code> · status: <strong>{status}</strong></p>
  <p>Type below — it's stored in Automerge and persists on reload, with no server.</p>
  <div class="editor" bind:this={el}></div>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    max-width: 42rem;
    margin: 3rem auto;
    padding: 0 1rem;
    line-height: 1.6;
  }
  .editor {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    min-height: 12rem;
    margin-top: 1rem;
  }
  :global(.editor .ProseMirror) {
    outline: none;
    min-height: 10rem;
  }
  :global(.editor .ProseMirror p) {
    margin: 0 0 0.75rem;
  }
  code {
    background: #f0f0f0;
    padding: 0 0.25rem;
    border-radius: 3px;
  }
</style>
