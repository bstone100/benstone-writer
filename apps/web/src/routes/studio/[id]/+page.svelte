<script lang="ts">
  import { Editor } from "@bw/ui";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const id = $derived(data.id);
</script>

<a class="back" href="/studio">← Studio</a>

{#key id}
  <Editor {id} />
{/key}

<style>
  .back {
    position: fixed;
    top: var(--space-4);
    left: var(--space-5);
    z-index: 10;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
    text-decoration: none;
  }
  .back:hover {
    color: var(--color-accent);
  }
</style>
