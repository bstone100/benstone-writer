<!--
  Text — the typographic primitive (§11.3/§11.8). Every run of text in a feature
  goes through here, so size/tone/family are chosen from the token scale by NAME
  (a constrained union), never as a raw value. `tone="inherit"` leaves color
  unset so the element follows its parent (e.g. a link's hover colors its title).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { sizeVar, familyVar, toneVar, leadingVar, type TextSize, type Tone, type Family, type Leading, type Weight } from "./tokens";

  let {
    as = "span",
    size = "base",
    tone = "ink",
    family,
    weight,
    leading,
    children,
  }: {
    as?: "span" | "p" | "div" | "small" | "strong";
    size?: TextSize;
    tone?: Tone;
    family?: Family;
    weight?: Weight;
    leading?: Leading;
    children: Snippet;
  } = $props();
</script>

<svelte:element
  this={as}
  class="text"
  style:font-size={sizeVar(size)}
  style:color={toneVar(tone)}
  style:font-family={family && familyVar(family)}
  style:font-weight={weight}
  style:line-height={leading && leadingVar(leading)}
>{@render children()}</svelte:element>

<style>
  .text {
    margin: 0;
  }
</style>
