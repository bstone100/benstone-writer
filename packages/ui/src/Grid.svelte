<!--
  Grid — a responsive auto-fill grid with a token gap (§11.8). Cards flow into as
  many columns as fit; collapses to one on a phone. The track-min is a layout
  constant, not a design-system axis, so it lives here once.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { spaceVar, type Space } from "./tokens";

  let {
    gap = 4,
    as = "div",
    children,
  }: { gap?: Space; as?: "div" | "ul"; children: Snippet } = $props();
</script>

<svelte:element this={as} class="grid" class:list={as === "ul"} style:gap={spaceVar(gap)}>
  {@render children()}
</svelte:element>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  }
  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
