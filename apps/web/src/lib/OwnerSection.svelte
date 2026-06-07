<script lang="ts">
  import { goto } from "$app/navigation";
  import { collection, createDocument } from "@bw/data";
  import { Stack, Grid, Heading, Text, Button, DocCard } from "@bw/ui";

  // The owner's section of the index (ROUND-2 R7) — drafts + New essay. This is
  // a CLIENT-ONLY island (dynamically imported by the index when /api/me says
  // owner), so the local-first registry (automerge/IndexedDB) never touches SSR.
  let { publishedIds }: { publishedIds: string[] } = $props();
  const published = $derived(new Set(publishedIds));
  const docs = collection(); // reactive {ids} of family-root documents (local-first)
  const draftIds = $derived($docs.ids.filter((id) => !published.has(id)));

  function newEssay() {
    void goto(`/documents/${createDocument({ title: "" })}`);
  }
</script>

<Stack gap={6}>
  <Stack as="header" direction="row" align="baseline" justify="between">
    <Heading level={2} size="xl">Drafts</Heading>
    <Button onclick={newEssay}>New essay</Button>
  </Stack>

  {#if draftIds.length === 0}
    <Text tone="muted" family="serif">No drafts — start one.</Text>
  {:else}
    <Grid as="ul">
      {#each draftIds as id (id)}
        <li><DocCard {id} href={`/documents/${id}`} /></li>
      {/each}
    </Grid>
  {/if}
</Stack>
