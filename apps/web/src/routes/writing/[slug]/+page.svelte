<script lang="ts">
  import { onMount } from "svelte";
  import { invalidateAll, goto } from "$app/navigation";
  import { Reader, Bar, Stack, Link, Text, Button } from "@bw/ui/reader";
  import { rpc } from "$lib/rpc";
  import type { FeedEvent } from "@bw/schema";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // §11.5: read and edit are two views of ONE entity. The public render is SSR +
  // zero editor JS. The owner — revealed out-of-band by /api/me so the cached
  // HTML never varies — gets an Edit affordance that lazy-loads the editor island
  // (the only place the editor/CRDT bundle is fetched) bound to the SAME document,
  // and swaps the static render for the live editor in place.
  let owner = $state(false);
  let editing = $state(false);
  let publishing = $state(false);
  let island = $state<typeof import("@bw/ui") | null>(null);
  const EditorComp = $derived(island?.Editor);

  onMount(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((m) => (owner = !!(m as { owner?: boolean }).owner))
      .catch(() => {});

    // Live updates (§7 #5): re-pull on republish, leave on unpublish. Never while
    // the owner is mid-edit. No reload, no poll.
    const es = new EventSource("/api/feed");
    const onEvent = (e: Event) => {
      const event = JSON.parse((e as MessageEvent).data) as FeedEvent;
      if (event.slug !== data.post.slug) return;
      if (event.type === "unpublished") void goto("/writing");
      else if (!editing) void invalidateAll();
    };
    es.addEventListener("published", onEvent);
    es.addEventListener("unpublished", onEvent);
    return () => es.close();
  });

  function withTransition(fn: () => void) {
    if (document.startViewTransition) document.startViewTransition(fn);
    else fn();
  }

  async function startEdit() {
    island ??= await import("@bw/ui"); // the editor chunk — only ever loaded here
    withTransition(() => (editing = true));
  }

  async function publishEdits() {
    if (!island || publishing) return;
    publishing = true;
    try {
      const req = await island.renderForPublish(data.post.sourceId);
      await rpc.publish(req); // re-render the published projection (typed RPC)
      withTransition(() => (editing = false));
      void invalidateAll(); // pull the freshly published content into the reader
    } finally {
      publishing = false;
    }
  }
</script>

<svelte:head>
  <title>{data.post.title || "Untitled"} — Ben Stone</title>
  <meta name="description" content={data.post.excerpt} />
</svelte:head>

{#if owner}
  <Bar edge="top" justify="between">
    <Link href="/writing" tone="muted">
      <Text size="sm" family="sans" tone="inherit">← Writing</Text>
    </Link>
    {#if editing}
      <Stack direction="row" gap={4} align="center">
        <Button variant="link" onclick={() => withTransition(() => (editing = false))}>Done</Button>
        <Button variant="link" disabled={publishing} onclick={publishEdits}>
          {publishing ? "Publishing…" : "Publish ↗"}
        </Button>
      </Stack>
    {:else}
      <Button variant="link" onclick={startEdit}>Edit</Button>
    {/if}
  </Bar>
{/if}

{#if editing && EditorComp}
  <EditorComp id={data.post.sourceId} />
{:else}
  <Reader post={data.post} />
{/if}
