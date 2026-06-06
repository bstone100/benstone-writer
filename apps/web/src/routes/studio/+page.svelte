<script lang="ts">
  import { goto } from "$app/navigation";
  import { collection, createDocument } from "@bw/data";
  import { Container, Stack, Grid, Heading, Text, Button, DocCard } from "@bw/ui";

  // Reactive list of document ids from the registry (§11.1).
  const docs = collection();

  function newEssay() {
    const id = createDocument({ title: "" });
    void goto(`/studio/${id}`); // descend into the new document
  }
</script>

<svelte:head><title>Studio — Ben Stone</title></svelte:head>

<Container size="wide">
  <Stack gap={10}>
    <Stack as="header" direction="row" align="baseline" justify="between">
      <Heading level={1}>Studio</Heading>
      <Button onclick={newEssay}>New essay</Button>
    </Stack>

    {#if $docs.ids.length === 0}
      <Text tone="muted" family="serif">No documents yet — start one.</Text>
    {:else}
      <Grid as="ul">
        {#each $docs.ids as id (id)}
          <li><DocCard {id} href={`/studio/${id}`} /></li>
        {/each}
      </Grid>
    {/if}
  </Stack>
</Container>
