<!--
  EditorOverlay — the floating UI layer of the invisible editor (§11.8). Rendered
  as a SIBLING of the ProseMirror DOM (never inside it, never as a widget
  decoration — those corrupt coordsAtPos), it reads the reactive `ui` the bridge
  plugin writes and floats the selection bubble (and, next, the slash menu) over
  the editor. Positioning is @floating-ui/dom against a virtual element backed by
  view.coordsAtPos — the established tool for this exact problem.
-->
<script lang="ts">
  import { computePosition, autoUpdate, offset, flip, shift } from "@floating-ui/dom";
  import type { EditorView } from "prosemirror-view";
  import { toggleMarkByName, BUBBLE_MARKS, type BubbleMark, type BubbleState } from "./bubble";

  let { view, ui }: { view: EditorView; ui: { bubble: BubbleState } } = $props();

  let bubbleEl = $state<HTMLDivElement>();

  // A virtual anchor: the union of the selection endpoints' caret rects (viewport
  // coords, which is what coordsAtPos returns and Floating UI's fixed strategy wants).
  function selectionRect(from: number, to: number): DOMRect {
    const a = view.coordsAtPos(from);
    const b = view.coordsAtPos(to);
    const left = Math.min(a.left, b.left);
    const right = Math.max(a.right, b.right);
    const top = Math.min(a.top, b.top);
    const bottom = Math.max(a.bottom, b.bottom);
    return { x: left, y: top, left, right, top, bottom, width: right - left, height: bottom - top, toJSON() {} };
  }

  // Reposition while the bubble is open; tear down when it closes or range moves.
  $effect(() => {
    const b = ui.bubble;
    if (!b || !bubbleEl) return;
    const from = b.from;
    const to = b.to;
    const virtual = { getBoundingClientRect: () => selectionRect(from, to) };
    return autoUpdate(virtual, bubbleEl, () => {
      void computePosition(virtual, bubbleEl!, {
        placement: "top",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        if (bubbleEl) {
          bubbleEl.style.left = `${x}px`;
          bubbleEl.style.top = `${y}px`;
        }
      });
    });
  });

  const LABEL: Record<BubbleMark, string> = { strong: "B", em: "I", code: "‹›" };
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
          e.preventDefault(); // keep the selection; don't blur the editor
          toggleMarkByName(view, m);
        }}
      >
        {LABEL[m]}
      </button>
    {/each}
  </div>
{/if}

<style>
  .bubble {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-paper-raised) 92%, transparent);
    backdrop-filter: blur(8px);
    box-shadow: 0 6px 24px color-mix(in srgb, var(--color-ink) 12%, transparent);
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
</style>
