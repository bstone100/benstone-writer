<script lang="ts">
  import { onMount, tick } from "svelte";
  import { invalidateAll, goto } from "$app/navigation";
  import { Reader, Button, Text } from "@bw/ui/reader";
  import TopBar from "$lib/TopBar.svelte";
  import { session } from "$lib/owner.svelte";
  import { rpc } from "$lib/rpc";
  import type { FeedEvent, VersionMeta } from "@bw/schema";
  import type { SaveState } from "@bw/data";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // ONE surface (ROUND-2 R1/R2): two views of one entity at one URL. A PUBLISHED
  // doc renders the Reader for everyone (cacheable); the owner's Edit affordance is
  // revealed via the shared session store. A DRAFT (post === null) is owner-only —
  // the load already proved the owner — so we drop straight into the editor. The
  // editor/CRDT bundle is the ONLY place it loads, and only client-side.
  let editing = $state(false);
  // Brief: the editor is torn down while a restore rewrites the draft wholesale, so
  // no live ProseMirror view mis-applies the patch (R5; see restore()).
  let reloading = $state(false);
  let island = $state<typeof import("@bw/ui") | null>(null);
  const EditorComp = $derived(island?.Editor);
  const HistoryComp = $derived(island?.History);

  // Cloud-save status (R4) — honest durability: "Saved" only once the cloud holds
  // an R2-persisted copy of what's on screen (safe to close the laptop).
  const SAVE_LABEL: Record<SaveState, string> = { offline: "Offline", saving: "Saving…", saved: "Saved" };
  let saveState = $state<SaveState | undefined>();
  let unsubStatus: (() => void) | undefined;

  // Version model (R5) — the history panel + the server's live pointer / vN tags.
  let showHistory = $state(false);
  let liveHeads = $state<string[] | null>(null);
  let versions = $state<VersionMeta[]>([]);

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

  // The server owns the live pointer + the monotonic vN counter; refetch after any
  // version action so the panel's crown / vN tags reflect the durable truth (R5).
  async function refreshVersions() {
    const v = await rpc.versions({ id: data.id });
    liveHeads = v.liveHeads;
    versions = v.versions;
  }
  async function openHistory() {
    island ??= await import("@bw/ui");
    await refreshVersions();
    showHistory = true;
  }

  // ⋮ Make live — render this version to static HTML and move LIVE to it (R5).
  async function makeLive(heads: string[]) {
    island ??= await import("@bw/ui");
    const req = await island.renderForPublish(data.id, heads);
    await rpc.makeLive({ ...req, heads });
    await refreshVersions();
    void invalidateAll(); // the public projection changed
  }
  // ⋮ Restore to draft — roll this version's content forward to HEAD (one linear
  // change; §3.3). The draft becomes that version. The data lands correctly, but a
  // LIVE ProseMirror view mis-replays the wholesale-replace patch (garbles the view
  // only — verified). So tear the editor down first, mutate, then re-mount it fresh
  // on the restored draft.
  async function restore(heads: string[]) {
    showHistory = false;
    reloading = true;
    await tick(); // editor unmounts before the doc is rewritten
    const { restoreToHead } = await import("@bw/data");
    await restoreToHead(data.id, heads);
    reloading = false;
    if (!editing) await startEdit();
  }
  // ⋮ Name version — attach a human label (distinct from the automatic vN).
  async function nameVersion(heads: string[], name: string) {
    await rpc.nameVersion({ id: data.id, heads, name });
    await refreshVersions();
  }
</script>

<svelte:head>
  <title>{(data.post?.title ?? "") || "Untitled"} — Ben Stone</title>
  {#if data.post}<meta name="description" content={data.post.excerpt} />{/if}
</svelte:head>

<TopBar>
  {#if session.owner}
    {#if editing && saveState}<Text size="sm" tone="muted" family="sans">{SAVE_LABEL[saveState]}</Text>{/if}
    <Button variant="link" onclick={openHistory}>History</Button>
    {#if editing}
      {#if data.post}
        <Button variant="link" onclick={() => withTransition(() => (editing = false))}>Done</Button>
      {/if}
    {:else}
      <Button variant="link" onclick={startEdit}>Edit</Button>
    {/if}
  {/if}
</TopBar>

{#if reloading}
  <!-- editor torn down for a restore swap; re-mounts fresh once the draft is rewritten -->
{:else if editing && EditorComp}
  <EditorComp id={data.id} />
{:else if data.post}
  <Reader post={data.post} />
{/if}

{#if showHistory && HistoryComp}
  <HistoryComp
    id={data.id}
    {liveHeads}
    {versions}
    onMakeLive={makeLive}
    onRestore={restore}
    onName={nameVersion}
    onclose={() => (showHistory = false)}
  />
{/if}
