<script lang="ts">
  import { goto } from "$app/navigation";
  import { branchHere } from "@bw/data";
  import { Editor, History, BranchPicker, Bar, Stack, Link, Text, Button, renderForPublish } from "@bw/ui";
  import { rpc } from "$lib/rpc";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const id = $derived(data.id);

  let showHistory = $state(false);
  let publishing = $state(false);
  let focusMode = $state(false); // dim all but the active block while writing (Mod-Shift-f)

  async function newBranch() {
    const branchId = await branchHere(id); // fork from the current state
    void goto(`/studio/${branchId}`); // switch to it (siblings → lateral motion)
  }

  function onBranch(newId: string) {
    showHistory = false;
    void goto(`/studio/${newId}`);
  }

  async function publish() {
    if (publishing) return;
    publishing = true;
    try {
      const req = await renderForPublish(id); // render to static HTML, client-side
      const { slug } = await rpc.publish(req); // typed RPC — input/output inferred from the contract
      window.open(`/writing/${slug}`, "_blank");
    } finally {
      publishing = false;
    }
  }
</script>

<Bar edge="top" justify="between">
  <Stack direction="row" gap={5} align="center" wrap>
    <Link href="/studio" tone="muted">
      <Text size="sm" family="sans" tone="inherit">← Studio</Text>
    </Link>
    {#key id}
      <BranchPicker {id} hrefFor={(branchId) => `/studio/${branchId}`} onnew={newBranch} />
    {/key}
  </Stack>

  <Stack direction="row" gap={4} align="center">
    <Button variant="link" onclick={() => (focusMode = !focusMode)}>{focusMode ? "Focus ✓" : "Focus"}</Button>
    <Button variant="link" onclick={() => (showHistory = true)}>History</Button>
    <Button variant="link" disabled={publishing} onclick={publish}>
      {publishing ? "Publishing…" : "Publish ↗"}
    </Button>
  </Stack>
</Bar>

{#key id}
  <Editor {id} bind:focusMode />
{/key}

{#if showHistory}
  <History {id} onbranch={onBranch} onclose={() => (showHistory = false)} />
{/if}
