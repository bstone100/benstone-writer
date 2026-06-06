<script lang="ts">
  import { goto } from "$app/navigation";
  import { collection, createDocument } from "@bw/data";
  import DocCard from "$lib/DocCard.svelte";

  // Reactive list of document ids from the registry (§11.1).
  const docs = collection();

  function newEssay() {
    const id = createDocument({ title: "" });
    void goto(`/studio/${id}`); // descend into the new document
  }
</script>

<svelte:head><title>Studio — Ben Stone</title></svelte:head>

<main class="library">
  <header>
    <h1>Studio</h1>
    <button class="new" onclick={newEssay}>New essay</button>
  </header>

  {#if $docs.ids.length === 0}
    <p class="empty">No documents yet — start one.</p>
  {:else}
    <ul class="grid">
      {#each $docs.ids as id (id)}
        <li><DocCard {id} /></li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .library {
    max-width: 52rem;
    margin: 0 auto;
    padding: var(--space-16) var(--space-6) var(--space-16);
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--space-10);
  }
  h1 {
    font-family: var(--font-serif);
    font-size: var(--text-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0;
  }
  .new {
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper-raised);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .empty {
    color: var(--color-ink-muted);
    font-family: var(--font-serif);
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: var(--space-4);
  }
</style>
