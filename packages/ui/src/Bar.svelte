<!--
  Bar — fixed/sticky chrome (§11.8): the studio's top header, the editor's bottom
  devbar. Blur surface + hairline border, a padded row. `edge` picks which side
  it sticks to. Features compose a Bar instead of hand-rolling sticky/blur CSS.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { spaceVar, type Space } from "./tokens";

  let {
    edge = "top",
    gap = 5,
    justify = "start",
    children,
  }: {
    edge?: "top" | "bottom";
    gap?: Space;
    justify?: "start" | "between" | "end";
    children: Snippet;
  } = $props();

  const JUSTIFY = { start: "flex-start", between: "space-between", end: "flex-end" };
</script>

<div class="bar {edge}" style:gap={spaceVar(gap)} style:justify-content={JUSTIFY[justify]}>
  {@render children()}
</div>

<style>
  .bar {
    z-index: 10;
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-5);
    background: color-mix(in srgb, var(--color-paper) 88%, transparent);
    backdrop-filter: blur(8px);
  }
  .top {
    position: sticky;
    top: 0;
    border-bottom: 1px solid var(--color-rule);
  }
  .bottom {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    border-top: 1px solid var(--color-rule);
  }
</style>
