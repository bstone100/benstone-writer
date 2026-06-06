<script lang="ts">
  import { untrack } from "svelte";
  import { read } from "@bw/data";
  import { P } from "@bw/schema";

  // §11.2: the card is handed only an id; it reads its OWN title by path. Each
  // card is keyed by id in the list, so the id is stable for its lifetime.
  let { id }: { id: string } = $props();
  const title = untrack(() => read<string>(P.document(id).title));
</script>

<a class="card" href={`/studio/${id}`}>
  <span class="t">{$title || "Untitled"}</span>
  <span class="go">→</span>
</a>

<style>
  .card {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5) var(--space-5);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-lg);
    background: var(--color-paper-raised);
    text-decoration: none;
    color: var(--color-ink);
    transition:
      border-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }
  .card:hover {
    border-color: var(--color-ink-faint);
    transform: translateY(-1px);
  }
  .t {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-weight: 600;
    line-height: var(--leading-snug);
  }
  .go {
    color: var(--color-ink-faint);
    font-family: var(--font-sans);
  }
</style>
