<!--
  BranchPicker — list and switch between the branches of a document family (§8).
  Data contract (§11.2): handed only `id`; it reads its own family via branches(id).
  Switching is a real <a> navigation (the parent supplies hrefFor), so it goes
  through the router → the path-derived LATERAL transition (siblings) fires for
  free (§12). "+ branch" forks from the current state.
-->
<script lang="ts">
  import { untrack } from "svelte";
  import { branches } from "@bw/data";

  let {
    id,
    hrefFor,
    onnew,
  }: {
    id: string;
    hrefFor: (branchId: string) => string;
    onnew?: () => void;
  } = $props();

  // id is stable for this instance (parent re-keys on switch).
  const list = untrack(() => branches(id));

  const fmt = (t: number) =>
    t ? new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
</script>

{#if $list.length > 1 || onnew}
  <nav class="branches" aria-label="Branches">
    <ul>
      {#each $list as b (b.id)}
        <li>
          <a
            class="branch"
            class:current={b.current}
            href={hrefFor(b.id)}
            aria-current={b.current ? "page" : undefined}
          >
            <span class="name">{b.name}</span>
            {#if b.parent}<span class="when">{fmt(b.createdAt)}</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
    {#if onnew}
      <button class="new" onclick={onnew} title="Branch from the current state">+ branch</button>
    {/if}
  </nav>
{/if}

<style>
  .branches {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-sans);
  }
  ul {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    list-style: none;
    margin: 0;
    padding: 0;
    flex-wrap: wrap;
  }
  .branch {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--color-rule);
    text-decoration: none;
    color: var(--color-ink-muted);
    font-size: var(--text-sm);
    line-height: 1.4;
  }
  .branch:hover {
    border-color: var(--color-ink-faint);
    color: var(--color-ink);
  }
  .branch.current {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }
  .name {
    font-weight: 600;
  }
  .when {
    font-size: var(--text-xs);
    color: var(--color-ink-faint);
  }
  .new {
    border: none;
    background: none;
    cursor: pointer;
    font: inherit;
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
    padding: var(--space-1) var(--space-2);
  }
  .new:hover {
    color: var(--color-accent);
  }
</style>
