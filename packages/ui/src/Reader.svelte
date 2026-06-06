<!--
  Reader — the public reading view of a published post (§11.5, §11.6). Renders
  pre-rendered static HTML in the SAME Prose measure the editor uses, so reading
  and writing are visibly the same column. Imports NO editor/CRDT code, so it
  SSRs and ships zero editor JS to readers.

  The `{@html}` is safe: the HTML was produced by DOMSerializer over our own
  schema at publish time, which can only emit known nodes/marks.
-->
<script lang="ts">
  import { P, type PublishedPost } from "@bw/schema";
  import Prose from "./Prose.svelte";
  import { vtName } from "./motion";

  let { post }: { post: PublishedPost } = $props();

  const date = $derived(
    new Date(post.publishedAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );
</script>

<article class="reader">
  <Prose>
    <h1 class="rtitle" style:view-transition-name={vtName(P.published(post.slug))}>
      {post.title || "Untitled"}
    </h1>
    <p class="rmeta">{date}</p>
    {@html post.html}
  </Prose>
</article>

<style>
  .reader {
    padding: var(--space-24) var(--space-6) var(--space-16);
  }
  .rtitle {
    font-size: var(--text-3xl);
    font-weight: 700;
    line-height: var(--leading-tight);
    letter-spacing: -0.018em;
    margin: 0 0 var(--space-2);
  }
  .rmeta {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
    margin: 0 0 var(--space-8);
  }
</style>
