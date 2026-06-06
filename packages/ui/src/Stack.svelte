<!--
  Stack — flex flow with a token gap (§11.8). The workhorse layout primitive:
  rows and columns, headers and lists. `as="ul"` resets list chrome. Features
  express arrangement by composing Stacks, never by writing flexbox.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { spaceVar, type Space } from "./tokens";

  let {
    direction = "column",
    gap,
    align,
    justify,
    wrap = false,
    divided = false,
    as = "div",
    children,
  }: {
    direction?: "row" | "column";
    gap?: Space;
    align?: "start" | "center" | "baseline" | "stretch" | "end";
    justify?: "start" | "center" | "between" | "end";
    wrap?: boolean;
    divided?: boolean; // hairline rules between items (and enclosing top/bottom)
    as?: "div" | "ul" | "ol" | "nav" | "header" | "footer" | "section";
    children: Snippet;
  } = $props();

  const ALIGN = { start: "flex-start", center: "center", baseline: "baseline", stretch: "stretch", end: "flex-end" };
  const JUSTIFY = { start: "flex-start", center: "center", between: "space-between", end: "flex-end" };
</script>

<svelte:element
  this={as}
  class="stack"
  class:list={as === "ul" || as === "ol"}
  class:divided
  style:flex-direction={direction}
  style:gap={spaceVar(gap)}
  style:align-items={align && ALIGN[align]}
  style:justify-content={justify && JUSTIFY[justify]}
  style:flex-wrap={wrap ? "wrap" : undefined}
>{@render children()}</svelte:element>

<style>
  .stack {
    display: flex;
    min-width: 0;
  }
  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .divided > :global(*) {
    border-top: 1px solid var(--color-rule);
  }
  .divided > :global(*:last-child) {
    border-bottom: 1px solid var(--color-rule);
  }
</style>
