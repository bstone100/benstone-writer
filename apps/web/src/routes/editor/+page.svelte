<script lang="ts">
  import { onMount } from "svelte";
  import { createDocument } from "@bw/data";
  import { Editor } from "@bw/ui";

  // Dev harness for the invisible editor. `?doc={id}` opens a specific document
  // (a second view / another device → proves cloud sync); otherwise a single
  // stable local doc across reloads. Real routing lands with auth/publish.
  let id = $state<string | null>(null);

  onMount(() => {
    const fromUrl = new URLSearchParams(location.search).get("doc");
    if (fromUrl) {
      id = fromUrl;
      return;
    }
    let existing = localStorage.getItem("editor-doc");
    if (!existing) {
      existing = createDocument({ title: "" });
      localStorage.setItem("editor-doc", existing);
    }
    id = existing;
  });
</script>

{#if id}
  <Editor {id} />
  <footer class="devbar">
    doc <code>{id}</code>
    · <a href={`/editor?doc=${id}`} target="_blank" rel="noreferrer">open 2nd view ↗</a>
  </footer>
{/if}

<style>
  .devbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-ink-muted);
    background: color-mix(in srgb, var(--color-paper) 86%, transparent);
    border-top: 1px solid var(--color-rule);
    padding: var(--space-2) var(--space-4);
    backdrop-filter: blur(6px);
  }
  .devbar code {
    color: var(--color-ink);
  }
  .devbar a {
    color: var(--color-accent);
  }
</style>
