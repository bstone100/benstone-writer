<script lang="ts">
  import { onMount } from "svelte";
  import { invalidateAll, goto } from "$app/navigation";
  import { Reader } from "@bw/ui/reader";
  import type { FeedEvent } from "@bw/schema";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Live updates (§7 #5): if THIS post is (re)published, re-pull it in place; if
  // it's unpublished, leave for the index. Never a reload, never a poll. SSR
  // already painted it instantly.
  onMount(() => {
    const es = new EventSource("/api/feed");
    const onEvent = (e: Event) => {
      const event = JSON.parse((e as MessageEvent).data) as FeedEvent;
      if (event.slug !== data.post.slug) return;
      if (event.type === "unpublished") void goto("/writing");
      else void invalidateAll();
    };
    es.addEventListener("published", onEvent);
    es.addEventListener("unpublished", onEvent);
    return () => es.close();
  });
</script>

<svelte:head>
  <title>{data.post.title || "Untitled"} — Ben Stone</title>
  <meta name="description" content={data.post.excerpt} />
</svelte:head>

<Reader post={data.post} />
