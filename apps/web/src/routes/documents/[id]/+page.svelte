<script lang="ts">
  import { onMount } from "svelte";
  import { invalidateAll, goto } from "$app/navigation";
  import { Reader, Bar, Stack, Link, Text, Button } from "@bw/ui/reader";
  import { rpc } from "$lib/rpc";
  import type { FeedEvent } from "@bw/schema";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // ONE surface (ROUND-2 R1/R2): two views of one entity at one URL. A PUBLISHED
  // doc renders the Reader for everyone (cacheable) and reveals the owner's Edit
  // affordance out-of-band via /api/me. A DRAFT (post === null) is owner-only —
  // the load already proved the owner — so we drop straight into the editor.
  // (The editor/CRDT bundle is the ONLY place it loads, and only client-side.)
  let owner = $state(false);
  let editing = $state(false);
  let publishing = $state(false);
  let island = $state<typeof import("@bw/ui") | null>(null);
  const EditorComp = $derived(island?.Editor);

  onMount(() => {
    if (data.post) {
      fetch("/api/me")
        .then((r) => r.json())
        .then((m) => (owner = !!(m as { owner?: boolean }).owner))
        .catch(() => {});
    } else {
      // Draft (post === null): the load already proved the owner → edit at once.
      owner = true;
      void startEdit();
    }

    // Live (§7 #5): re-pull on republish, leave on unpublish; never mid-edit.
    const es = new EventSource("/api/feed");
    const onEvent = (e: Event) => {
      const event = JSON.parse((e as MessageEvent).data) as FeedEvent;
      if (event.id !== data.id) return;
      if (event.type === "unpublished") void goto("/");
      else if (!editing) void invalidateAll();
    };
    es.addEventListener("published", onEvent);
    es.addEventListener("unpublished", onEvent);
    return () => es.close();
  });

  function withTransition(fn: () => void) {
    if (typeof document !== "undefined" && document.startViewTransition) document.startViewTransition(fn);
    else fn();
  }

  async function startEdit() {
    island ??= await import("@bw/ui"); // the editor chunk — only ever loaded here
    withTransition(() => (editing = true));
  }

  async function publishEdits() {
    if (publishing) return;
    publishing = true;
    try {
      island ??= await import("@bw/ui");
      const req = await island.renderForPublish(data.id);
      await rpc.publish(req); // render the published projection (typed RPC)
      withTransition(() => (editing = false));
      void invalidateAll();
    } finally {
      publishing = false;
    }
  }
</script>

<svelte:head>
  <title>{(data.post?.title ?? "") || "Untitled"} — Ben Stone</title>
  {#if data.post}<meta name="description" content={data.post.excerpt} />{/if}
</svelte:head>

{#if owner}
  <Bar edge="top" justify="between">
    <Link href="/" tone="muted"><Text size="sm" family="sans" tone="inherit">← Writing</Text></Link>
    {#if editing}
      <Stack direction="row" gap={4} align="center">
        {#if data.post}
          <Button variant="link" onclick={() => withTransition(() => (editing = false))}>Done</Button>
        {/if}
        <Button variant="link" disabled={publishing} onclick={publishEdits}>
          {publishing ? "Publishing…" : data.post ? "Publish ↗" : "Publish"}
        </Button>
      </Stack>
    {:else}
      <Button variant="link" onclick={startEdit}>Edit</Button>
    {/if}
  </Bar>
{/if}

{#if editing && EditorComp}
  <EditorComp id={data.id} />
{:else if data.post}
  <Reader post={data.post} />
{/if}
