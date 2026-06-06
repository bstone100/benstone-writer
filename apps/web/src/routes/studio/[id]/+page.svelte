<script lang="ts">
  import { goto } from "$app/navigation";
  import { branchHere } from "@bw/data";
  import { Editor, BranchPicker } from "@bw/ui";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const id = $derived(data.id);

  async function newBranch() {
    const branchId = await branchHere(id); // fork from the current state
    void goto(`/studio/${branchId}`); // switch to it (siblings → lateral motion)
  }
</script>

<header class="chrome">
  <a class="back" href="/studio">← Studio</a>
  {#key id}
    <BranchPicker {id} hrefFor={(branchId) => `/studio/${branchId}`} onnew={newBranch} />
  {/key}
</header>

{#key id}
  <Editor {id} />
{/key}

<style>
  .chrome {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-3) var(--space-5);
    background: color-mix(in srgb, var(--color-paper) 88%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--color-rule);
  }
  .back {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
    text-decoration: none;
    white-space: nowrap;
  }
  .back:hover {
    color: var(--color-accent);
  }
</style>
