<!--
  Prose — the shared reading/writing measure + typography (§11.8 Content).
  ONE definition of the long-form column, composed by both the editor body and
  the public reader, so "reading and writing share the exact same column"
  (§11.6) is true by construction, not by coincidence.

  It styles slotted content (the ProseMirror-rendered DOM while writing, the
  static HTML while reading) via `:global` descendant selectors — the markup
  inside is not Svelte-controlled, so this is the correct, intentional use of
  :global, scoped under `.prose`.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>

<div class="prose">
  {@render children()}
</div>

<style>
  .prose {
    max-width: var(--measure);
    margin: 0 auto;
    font-family: var(--font-serif);
    font-size: var(--text-base);
    line-height: var(--leading-prose);
    color: var(--color-ink);
    /* Crisp text on a 4K display: real kerning/ligatures, no synthetic bolding. */
    font-kerning: normal;
    font-feature-settings: "kern", "liga", "clig";
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* Block rhythm — paragraphs breathe; first block has no extra top gap. */
  .prose :global(p),
  .prose :global(blockquote),
  .prose :global(ul),
  .prose :global(ol),
  .prose :global(pre) {
    margin: 0 0 var(--prose-paragraph-gap);
  }
  .prose :global(> :first-child) {
    margin-top: 0;
  }
  .prose :global(> :last-child) {
    margin-bottom: 0;
  }

  /* Headings — same serif, tighter, clear hierarchy. */
  .prose :global(h1),
  .prose :global(h2),
  .prose :global(h3) {
    font-weight: 650;
    line-height: var(--leading-snug);
    letter-spacing: -0.01em;
    margin: var(--space-8) 0 var(--space-3);
  }
  .prose :global(h1) {
    font-size: var(--text-2xl);
  }
  .prose :global(h2) {
    font-size: var(--text-xl);
  }
  .prose :global(h3) {
    font-size: var(--text-lg);
  }

  .prose :global(blockquote) {
    padding-left: var(--space-5);
    border-left: 2px solid var(--color-rule);
    color: var(--color-ink-muted);
    font-style: italic;
  }

  .prose :global(a) {
    color: var(--color-accent);
    text-underline-offset: 0.16em;
    text-decoration-thickness: 1px;
  }

  .prose :global(strong) {
    font-weight: 650;
  }
  .prose :global(em) {
    font-style: italic;
  }

  .prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.92em;
  }

  .prose :global(ul),
  .prose :global(ol) {
    padding-left: var(--space-6);
  }
  .prose :global(li) {
    margin: 0.15em 0;
  }

  .prose :global(hr) {
    border: none;
    border-top: 1px solid var(--color-rule);
    margin: var(--space-10) 0;
  }
</style>
