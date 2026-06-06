<!--
  Heading — semantic h1–h3 with the type-scale decision baked in ONCE (serif,
  weight, tight tracking). `level` is the document outline; `size` is visual and
  defaults from the level but can be overridden (e.g. the reader's 3xl title on
  an h1). A feature can't make a heading the wrong size by accident.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { sizeVar, toneVar, familyVar, type TextSize, type Tone, type Family } from "./tokens";

  let {
    level = 1,
    size,
    tone = "ink",
    family = "serif",
    children,
  }: {
    level?: 1 | 2 | 3;
    size?: TextSize;
    tone?: Tone;
    family?: Family;
    children: Snippet;
  } = $props();

  const DEFAULT_SIZE: Record<1 | 2 | 3, TextSize> = { 1: "2xl", 2: "xl", 3: "lg" };
  const resolved = $derived(size ?? DEFAULT_SIZE[level]);
</script>

<svelte:element
  this={`h${level}`}
  class="heading"
  style:font-size={sizeVar(resolved)}
  style:color={toneVar(tone)}
  style:font-family={familyVar(family)}
>{@render children()}</svelte:element>

<style>
  .heading {
    margin: 0;
    font-weight: 700;
    line-height: var(--leading-tight);
    letter-spacing: -0.01em;
  }
</style>
