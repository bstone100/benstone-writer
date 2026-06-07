<script lang="ts">
  import { onMount } from "svelte";
  import { invalidateAll, goto } from "$app/navigation";
  import { Reader, Button, Text } from "@bw/ui/reader";
  import TopBar from "$lib/TopBar.svelte";
  import { session } from "$lib/owner.svelte";
  import { rpc } from "$lib/rpc";
  import type { FeedEvent } from "@bw/schema";
  import type { SaveState } from "@bw/data";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // ONE surface (ROUND-2 R1/R2): two views of one entity at one URL. A PUBLISHED
  // doc renders the Reader for everyone (cacheable); the owner's Edit affordance is
  // revealed via the shared session store. A DRAFT (post === null) is owner-only —
  // the load already proved the owner — so we drop straight into the editor. The
  // editor/CRDT bundle is the ONLY place it loads, and only client-side.
  let editing = $state(false);
  let publishing = $state(false);
  let island = $state<typeof import("@bw/ui") | null>(null);
  const EditorComp = $derived(island?.Editor);

  // Cloud-save status (R4) — honest durability: "Saved" only once the cloud holds
  // an R2-persisted copy of what's on screen (safe to close the laptop).
  const SAVE_LABEL: Record<SaveState, string> = { offline: "Offline", saving: "Saving…", saved: "Saved" };
  let saveState = $state<SaveState | undefined>();
  let unsubStatus: (() => void) | undefined;

  onMount(() => {
    if (!data.post) void startEdit(); // draft: owner proven by the load → edit at once

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
    return () => {
      es.close();
      unsubStatus?.();
    };
  });

  function withTransition(fn: () => void) {
    if (typeof document !== "undefined" && document.startViewTransition) document.startViewTransition(fn);
    else fn();
  }
  async function startEdit() {
    island ??= await import("@bw/ui"); // the editor chunk — only ever loaded here
    if (!unsubStatus) {
      const { saveStatus } = await import("@bw/data"); // dynamic → out of the SSR bundle
      unsubStatus = saveStatus(data.id).subscribe((s) => (saveState = s));
    }
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

<TopBar>
  {#if session.owner}
    {#if editing}
      {#if saveState}<Text size="sm" tone="muted" family="sans">{SAVE_LABEL[saveState]}</Text>{/if}
      {#if data.post}
        <Button variant="link" onclick={() => withTransition(() => (editing = false))}>Done</Button>
      {/if}
      <Button variant="link" disabled={publishing} onclick={publishEdits}>
        {publishing ? "Publishing…" : data.post ? "Publish ↗" : "Publish"}
      </Button>
    {:else}
      <Button variant="link" onclick={startEdit}>Edit</Button>
    {/if}
  {/if}
</TopBar>

{#if editing && EditorComp}
  <EditorComp id={data.id} />
{:else if data.post}
  <Reader post={data.post} />
{/if}
