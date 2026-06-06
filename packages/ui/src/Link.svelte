<!--
  Link — a navigational anchor (§11.8). Tone sets the resting color via an inline
  custom property (not inline `color`), so the static `:hover` rule can still win
  specificity and flip to accent. `tone="inherit"` + `hover` lets a row-level
  link drive the color of an inner `Text tone="inherit"` title.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { toneVar, spaceVar, type Tone, type Space } from "./tokens";

  let {
    href,
    tone = "ink",
    hover = true,
    block = false,
    py,
    target,
    rel,
    title,
    children,
  }: {
    href: string;
    tone?: Tone;
    hover?: boolean;
    block?: boolean; // fill the row (display: block) — whole-row clickable
    py?: Space; // vertical padding (block rows)
    target?: string;
    rel?: string;
    title?: string;
    children: Snippet;
  } = $props();
</script>

<a
  class="link"
  class:hover
  class:block
  {href}
  {target}
  {rel}
  {title}
  style:--link-color={toneVar(tone)}
  style:padding-block={spaceVar(py)}
>
  {@render children()}
</a>

<style>
  .link {
    color: var(--link-color, var(--color-ink));
    text-decoration: none;
  }
  .block {
    display: block;
  }
  .hover:hover {
    color: var(--color-accent);
  }
</style>
