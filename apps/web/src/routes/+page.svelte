<script lang="ts">
  import { onMount } from "svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { Container, Stack, Heading, Text, Link, Button } from "@bw/ui/reader";
  import { vtName } from "@bw/ui/motion";
  import { P } from "@bw/schema";
  import { session } from "$lib/owner.svelte";
  import TopBar from "$lib/TopBar.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // The owner's drafts island loads only when owner (out-of-band). A stable promise
  // (keyed on session.owner) so a live feed refresh doesn't remount it; the dynamic
  // import keeps automerge out of the SSR bundle.
  const ownerSection = $derived(session.owner ? import("$lib/OwnerSection.svelte") : null);

  onMount(() => {
    const es = new EventSource("/api/feed"); // live (§7 #5): refresh the list in place
    const refresh = () => void invalidateAll();
    es.addEventListener("published", refresh);
    es.addEventListener("unpublished", refresh);
    return () => es.close();
  });

  async function newEssay() {
    const { createDocument } = await import("@bw/data"); // dynamic → automerge out of SSR
    void goto(`/documents/${createDocument({ title: "" })}`);
  }
</script>

<svelte:head><title>Ben Stone</title></svelte:head>

<TopBar>
  {#if session.owner}<Button onclick={newEssay}>New essay</Button>{/if}
</TopBar>

<Container top={16}>
  <Stack gap={10}>
    <Stack gap={2}>
      <Heading level={1} size="3xl">Ben Stone</Heading>
      <Text size="lg" tone="muted" family="serif">Essays and notes.</Text>
    </Stack>

    {#if data.posts.length === 0}
      <Text tone="muted" family="serif">Nothing published yet.</Text>
    {:else}
      <Stack as="nav" divided>
        {#each data.posts as post (post.id)}
          <Link href={`/documents/${post.id}`} block py={5}>
            <Stack gap={1}>
              <Text size="lg" weight={600} family="serif" tone="inherit">
                <span style:view-transition-name={vtName(P.published(post.id))}>{post.title || "Untitled"}</span>
              </Text>
              {#if post.excerpt}<Text family="serif" tone="muted" leading="snug">{post.excerpt}</Text>{/if}
            </Stack>
          </Link>
        {/each}
      </Stack>
    {/if}

    {#if ownerSection}
      {#await ownerSection then { default: OwnerSection }}
        <OwnerSection publishedIds={data.posts.map((p) => p.id)} />
      {/await}
    {/if}
  </Stack>
</Container>
