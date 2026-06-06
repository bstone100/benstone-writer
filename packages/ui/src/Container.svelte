<!--
  Container — the centered reading/working column (§11.8). Every page sits in
  one: it owns the measure (reading width) and the page's outer padding, so no
  feature hand-rolls `max-width: …; margin: 0 auto`.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { spaceVar, type Space } from "./tokens";

  let {
    size = "measure",
    top = 16,
    bottom = 16,
    x = 6,
    children,
  }: {
    size?: "measure" | "wide";
    top?: Space;
    bottom?: Space;
    x?: Space;
    children: Snippet;
  } = $props();
</script>

<div
  class="container {size}"
  style:padding-top={spaceVar(top)}
  style:padding-bottom={spaceVar(bottom)}
  style:padding-left={spaceVar(x)}
  style:padding-right={spaceVar(x)}
>
  {@render children()}
</div>

<style>
  .container {
    width: 100%;
    margin-inline: auto;
  }
  .measure {
    max-width: var(--measure);
  }
  .wide {
    max-width: 52rem;
  }
</style>
