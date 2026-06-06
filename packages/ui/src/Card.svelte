<!--
  Card — a bordered surface (§11.8), optionally a link (`href`). The border, pad,
  radius, and hover lift live here once; DocCard and any future card compose it.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  let { href, children }: { href?: string; children: Snippet } = $props();
</script>

{#if href}
  <a class="card" {href}>{@render children()}</a>
{:else}
  <div class="card">{@render children()}</div>
{/if}

<style>
  .card {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-lg);
    background: var(--color-paper-raised);
    color: var(--color-ink);
    text-decoration: none;
    transition:
      border-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }
  .card:hover {
    border-color: var(--color-ink-faint);
    transform: translateY(-1px);
  }
</style>
