<script lang="ts">
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Writing — Ben Stone</title>
</svelte:head>

<main class="index">
  <h1>Writing</h1>
  {#if data.posts.length === 0}
    <p class="empty">Nothing published yet.</p>
  {:else}
    <ul>
      {#each data.posts as post (post.slug)}
        <li>
          <a href={`/writing/${post.slug}`}>
            <span class="t">{post.title || "Untitled"}</span>
            {#if post.excerpt}<span class="e">{post.excerpt}</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .index {
    max-width: var(--measure);
    margin: 0 auto;
    padding: var(--space-24) var(--space-6) var(--space-16);
    font-family: var(--font-serif);
  }
  h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0 0 var(--space-10);
    color: var(--color-ink);
  }
  .empty {
    color: var(--color-ink-muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    border-top: 1px solid var(--color-rule);
  }
  li:last-child {
    border-bottom: 1px solid var(--color-rule);
  }
  a {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-5) 0;
    text-decoration: none;
    color: var(--color-ink);
  }
  .t {
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .e {
    font-size: var(--text-base);
    color: var(--color-ink-muted);
    line-height: var(--leading-snug);
  }
  a:hover .t {
    color: var(--color-accent);
  }
</style>
