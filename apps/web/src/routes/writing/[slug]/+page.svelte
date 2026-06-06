<script lang="ts">
  import { Reader } from "@bw/ui/reader";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.post.title || "Untitled"} — Ben Stone</title>
  <meta name="description" content={data.post.excerpt} />
</svelte:head>

<Reader post={data.post} />
