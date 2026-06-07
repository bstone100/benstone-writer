<script lang="ts">
  import { collection } from "@bw/data";
  import { Stack, Grid, Heading, Text, DocCard } from "@bw/ui";

  // The owner's drafts on the index (ROUND-2 R7). A CLIENT-ONLY island (dynamically
  // imported when owner), so the local-first registry (automerge/IndexedDB) never
  // touches SSR. "New essay" lives in the TopBar; this is just the draft list.
  let { publishedIds }: { publishedIds: string[] } = $props();
  const published = $derived(new Set(publishedIds));
  const docs = collection(); // reactive {ids} of family-root documents (local-first)
  const draftIds = $derived($docs.ids.filter((id) => !published.has(id)));
</script>

<Stack gap={6}>
  <Heading level={2} size="xl">Drafts</Heading>
  {#if draftIds.length === 0}
    <Text tone="muted" family="serif">No drafts yet.</Text>
  {:else}
    <Grid as="ul">
      {#each draftIds as id (id)}
        <li><DocCard {id} href={`/documents/${id}`} /></li>
      {/each}
    </Grid>
  {/if}
</Stack>
