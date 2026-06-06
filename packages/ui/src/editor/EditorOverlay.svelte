<!--
  EditorOverlay — the floating UI layer of the invisible editor (§11.8). Rendered
  as a SIBLING of the ProseMirror DOM (never inside it, never a widget decoration
  — those corrupt coordsAtPos), it reads the reactive `ui` the bridge plugin
  writes and floats two surfaces over the editor:
    • selection bubble — inline format toggles for a non-empty selection.
    • slash menu — block insert/convert when a paragraph is "/<query>".
  Positioning is @floating-ui/dom against a virtual element backed by
  view.coordsAtPos. The slash menu owns its keyboard nav (a capture-phase keydown
  listener while open) so arrows/Enter/Esc never reach ProseMirror.
-->
<script lang="ts">
  import { computePosition, autoUpdate, offset, flip, shift } from "@floating-ui/dom";
  import type { EditorView } from "prosemirror-view";
  import { toggleMarkByName, BUBBLE_MARKS, type BubbleMark, type BubbleState } from "./bubble";
  import { filterSlash, type SlashItem, type SlashState } from "./slash";

  let { view, ui }: { view: EditorView; ui: { bubble: BubbleState; slash: SlashState } } = $props();

  // ---- shared: a viewport-coords rect from ProseMirror positions (Floating UI
  // virtual element). For a point anchor, pass the same pos twice.
  function rectFor(from: number, to: number): DOMRect {
    const a = view.coordsAtPos(from);
    const b = view.coordsAtPos(to);
    const left = Math.min(a.left, b.left);
    const right = Math.max(a.right, b.right);
    const top = Math.min(a.top, b.top);
    const bottom = Math.max(a.bottom, b.bottom);
    return { x: left, y: top, left, right, top, bottom, width: right - left, height: bottom - top, toJSON() {} };
  }

  function place(el: HTMLElement, from: number, to: number, placement: "top" | "bottom-start") {
    const virtual = { getBoundingClientRect: () => rectFor(from, to) };
    return autoUpdate(virtual, el, () => {
      void computePosition(virtual, el, {
        placement,
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      });
    });
  }

  // ---- selection bubble ----
  let bubbleEl = $state<HTMLDivElement>();
  $effect(() => {
    const b = ui.bubble;
    if (!b || !bubbleEl) return;
    return place(bubbleEl, b.from, b.to, "top");
  });
  const MARK_LABEL: Record<BubbleMark, string> = { strong: "B", em: "I", code: "‹›" };

  // ---- slash menu ----
  let slashEl = $state<HTMLDivElement>();
  let slashIndex = $state(0);
  let slashDismissed = $state(false);
  const filtered = $derived(ui.slash ? filterSlash(ui.slash.query) : []);
  const slashOpen = $derived(!!ui.slash && !slashDismissed && filtered.length > 0);

  // reset highlight when the query changes; clear dismissal when the menu closes
  $effect(() => {
    void ui.slash?.query;
    slashIndex = 0;
  });
  $effect(() => {
    if (!ui.slash) slashDismissed = false;
  });
  $effect(() => {
    const s = ui.slash;
    if (!slashOpen || !slashEl || !s) return;
    return place(slashEl, s.from, s.from, "bottom-start");
  });

  function applySlash(item: SlashItem) {
    const s = ui.slash;
    if (!s) return;
    view.dispatch(view.state.tr.delete(s.from, s.to)); // remove the "/query" text
    item.command(view.state.schema)(view.state, view.dispatch); // convert/insert block
    view.focus();
  }

  function onSlashKeydown(e: KeyboardEvent) {
    if (!slashOpen) return;
    const items = filtered;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      slashIndex = Math.min(slashIndex + 1, items.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      slashIndex = Math.max(slashIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const it = items[Math.min(slashIndex, items.length - 1)];
      if (it) applySlash(it);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      slashDismissed = true;
    }
  }

  // capture-phase so arrows/Enter/Esc are handled before ProseMirror sees them
  $effect(() => {
    if (!slashOpen) return;
    document.addEventListener("keydown", onSlashKeydown, true);
    return () => document.removeEventListener("keydown", onSlashKeydown, true);
  });
</script>

{#if ui.bubble}
  <div class="bubble" bind:this={bubbleEl} role="toolbar" aria-label="Format selection">
    {#each BUBBLE_MARKS as m (m)}
      <button
        type="button"
        class="fmt {m}"
        class:active={ui.bubble.active[m]}
        aria-pressed={ui.bubble.active[m]}
        aria-label={m}
        onmousedown={(e) => {
          e.preventDefault();
          toggleMarkByName(view, m);
        }}
      >
        {MARK_LABEL[m]}
      </button>
    {/each}
  </div>
{/if}

{#if slashOpen}
  <div class="slash" bind:this={slashEl} role="listbox" aria-label="Insert block">
    {#each filtered as item, i (item.id)}
      <button
        type="button"
        class="slash-item"
        class:active={i === slashIndex}
        role="option"
        aria-selected={i === slashIndex}
        onmousedown={(e) => {
          e.preventDefault();
          applySlash(item);
        }}
        onmouseenter={() => (slashIndex = i)}
      >
        <span class="slash-label">{item.label}</span>
        <span class="slash-hint">{item.hint}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .bubble,
  .slash {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-paper-raised) 92%, transparent);
    backdrop-filter: blur(8px);
    box-shadow: 0 6px 24px color-mix(in srgb, var(--color-ink) 12%, transparent);
  }

  .bubble {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
  }
  .fmt {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--space-6);
    height: var(--space-6);
    padding: 0 var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .fmt:hover {
    background: color-mix(in srgb, var(--color-ink) 6%, transparent);
    color: var(--color-ink);
  }
  .fmt.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
  }
  .fmt.strong {
    font-weight: 700;
  }
  .fmt.em {
    font-style: italic;
  }
  .fmt.code {
    font-family: var(--font-mono);
  }

  .slash {
    display: flex;
    flex-direction: column;
    width: 14rem;
    padding: var(--space-1);
  }
  .slash-item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }
  .slash-item.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
  }
  .slash-hint {
    color: var(--color-ink-faint);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
  .slash-item.active .slash-hint {
    color: var(--color-accent);
  }
</style>
