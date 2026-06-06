<!--
  Button — the only way a feature renders an action (§11.8). Two variants:
  `primary` (accent fill) and `link` (text button that inherits its context's
  type). Every visual decision lives here, so a feature can't mint an off-system
  button.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    variant = "primary",
    type = "button",
    disabled = false,
    onclick,
    title,
    children,
  }: {
    variant?: "primary" | "link";
    type?: "button" | "submit";
    disabled?: boolean;
    onclick?: () => void;
    title?: string;
    children: Snippet;
  } = $props();
</script>

<button class="btn {variant}" {type} {disabled} {onclick} {title}>
  {@render children()}
</button>

<style>
  .btn {
    font-family: var(--font-sans);
    cursor: pointer;
  }
  .btn:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .primary {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
    background: var(--color-accent);
    color: var(--color-paper-raised);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    color: var(--color-ink-muted);
    font: inherit;
  }
  .link:hover {
    color: var(--color-accent);
  }
</style>
