<!--
  Editor — the invisible writing surface (§11.5, §11.8). The text IS the
  interface: no toolbar, no chrome, just a title and a body on the shared Prose
  measure, so reading and writing are visibly the same column.

  Data contract (§11.2): the only prop is `id` — IDENTITY, never data. The
  component fetches everything else itself by path:
    • title  → read()/mutate() over the path API (a normal field).
    • body   → getHandle(id) + @automerge/prosemirror's init(), the ONE
               sanctioned use of a raw handle (§11.5), because rich text binds
               at the CRDT level, not as a scalar value.
  Edits write straight to the local Automerge doc — instant, never awaiting the
  network (§11.4). Sync is background (task #5).
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { read, mutate, getHandle, enableSync } from "@bw/data";
  import { P } from "@bw/schema";
  import { init } from "@automerge/prosemirror";
  import { EditorState } from "prosemirror-state";
  import { EditorView } from "prosemirror-view";
  import { keymap } from "prosemirror-keymap";
  import { baseKeymap } from "prosemirror-commands";
  import { history } from "prosemirror-history";
  import { buildKeymap } from "./editor/keymap";
  import { buildInputRules } from "./editor/inputrules";
  import { bridge } from "./editor/bridge";
  import { bubbleState, type BubbleState } from "./editor/bubble";
  import { slashState, type SlashState } from "./editor/slash";
  import EditorOverlay from "./editor/EditorOverlay.svelte";
  import { placeholder } from "./placeholder";
  import { vtName } from "./motion";
  import Prose from "./Prose.svelte";

  let { id }: { id: string } = $props();

  let title = $state<string | undefined>(undefined);
  let titleEl: HTMLTextAreaElement;
  let bodyEl: HTMLDivElement;
  let view = $state<EditorView | undefined>(undefined);
  // Transient floating-UI state the bridge plugin writes and the overlay reads.
  let ui = $state<{ bubble: BubbleState; slash: SlashState }>({ bubble: null, slash: null });

  // The title is a textarea, not an input, so a long title WRAPS within the
  // measure instead of clipping. Auto-grow keeps it chromeless (no scrollbar,
  // grows to fit its lines).
  function autogrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function onTitleInput(e: Event) {
    const el = e.currentTarget as HTMLTextAreaElement;
    autogrow(el);
    mutate(P.document(id).root, (doc) => {
      doc.title = el.value;
      doc.updatedAt = Date.now();
    });
  }

  function onTitleKeydown(e: KeyboardEvent) {
    // A title is one logical line; Enter moves to the body rather than newline.
    if (e.key === "Enter") {
      e.preventDefault();
      view?.focus();
    }
  }

  // Re-grow whenever the title (re)loads from the store (initial + external).
  $effect(() => {
    void title;
    if (titleEl) autogrow(titleEl);
  });

  onMount(() => {
    // Open this document's cloud sync (§8.1). Background; typing never waits.
    enableSync(id);

    // Title: self-subscribe by path (§11.1). Auto-unsubscribes on unmount.
    const titleStore = read<string>(P.document(id).title);
    const unsubTitle = titleStore.subscribe((v) => (title = v));

    // Body: bind the CRDT text to a ProseMirror view (§11.5).
    let cancelled = false;
    void getHandle(id).then(async (handle) => {
      await handle.whenReady();
      if (cancelled) return;
      const { schema, pmDoc, plugin } = init(handle, ["body"]);
      view = new EditorView(bodyEl, {
        state: EditorState.create({
          schema,
          doc: pmDoc,
          plugins: [
            history(),
            keymap(buildKeymap(schema)), // marks · lists · history · hard-break
            keymap(baseKeymap),
            buildInputRules(schema), // markdown-as-you-type (## , - , > , ``` , ---)
            placeholder("Begin writing…"),
            bridge((v) => {
              // PM → Svelte overlay (bubble + slash), one write per transaction.
              ui.bubble = bubbleState(v.state);
              ui.slash = slashState(v.state);
            }),
            plugin, // the Automerge ↔ ProseMirror sync plugin (must be last)
          ],
        }),
      });
      // Dev-only handle for programmatic verification (stripped from prod builds
      // by the DEV constant — never ships).
      if (import.meta.env.DEV) (bodyEl as unknown as { pmView?: EditorView }).pmView = view;
    });

    return () => {
      cancelled = true;
      unsubTitle();
      view?.destroy();
      view = undefined;
    };
  });
</script>

<article class="editor">
  <Prose>
    <textarea
      class="doc-title"
      placeholder="Untitled"
      rows="1"
      value={title ?? ""}
      oninput={onTitleInput}
      onkeydown={onTitleKeydown}
      bind:this={titleEl}
      spellcheck="false"
      name="title"
      aria-label="Title"
      style:view-transition-name={vtName(P.document(id).title)}
    ></textarea>
    <div class="doc-body" bind:this={bodyEl}></div>
  </Prose>
  {#if view}<EditorOverlay {view} {ui} />{/if}
</article>

<style>
  .editor {
    padding: var(--space-24) var(--space-6);
  }

  /* Title — same serif as the body, just larger; a textarea that reads as an H1
     and WRAPS instead of clipping. Auto-grown in height; never shows a
     scrollbar or resize handle. */
  .doc-title {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border: none;
    outline: none;
    background: transparent;
    padding: 0;
    margin: 0 0 var(--space-5);
    resize: none;
    overflow: hidden;
    font-family: var(--font-serif);
    font-size: var(--text-3xl);
    font-weight: 700;
    line-height: var(--leading-tight);
    letter-spacing: -0.018em;
    color: var(--color-ink);
  }
  .doc-title::placeholder {
    color: var(--color-ink-faint);
    opacity: 1;
  }

  /* The ProseMirror canvas — zero chrome; typography inherited from Prose. */
  .doc-body :global(.ProseMirror) {
    outline: none;
    min-height: 56vh;
    white-space: pre-wrap;
    word-wrap: break-word;
    caret-color: var(--color-accent);
  }
  .doc-body :global(.ProseMirror::selection),
  .doc-body :global(.ProseMirror ::selection) {
    background: var(--color-selection);
  }

  /* Empty-document prompt — a decoration (placeholder.ts), not real content. */
  .doc-body :global(.ProseMirror p.is-empty::before) {
    content: attr(data-placeholder);
    color: var(--color-ink-faint);
    pointer-events: none;
    float: left;
    height: 0;
  }
</style>
