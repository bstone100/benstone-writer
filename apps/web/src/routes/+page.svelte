<script lang="ts">
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Container, Stack, Heading, Text, Link } from "@bw/ui/reader";
  import { vtName } from "@bw/ui/motion";
  import { P } from "@bw/schema";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // The single root surface (ROUND-2 R1). Visitors see the published essays; the
  // owner additionally gets drafts + New essay. Owner status and the owner
  // section load CLIENT-side (out-of-band) so this SSR HTML stays identical for
  // everyone and cacheable — and automerge never enters the SSR bundle.
  let owner = $state(false);
  let ownerSection = $state<Promise<typeof import("$lib/OwnerSection.svelte")> | null>(null);

  onMount(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((m) => {
        owner = !!(m as { owner?: boolean }).owner;
        if (owner) ownerSection = import("$lib/OwnerSection.svelte");
      })
      .catch(() => {});

    // Live (§7 #5): any publish/unpublish refreshes the list in place — no reload.
    const es = new EventSource("/api/feed");
    const refresh = () => void invalidateAll();
    es.addEventListener("published", refresh);
    es.addEventListener("unpublished", refresh);
    return () => es.close();
  });
</script>

<svelte:head><title>Ben Stone</title></svelte:head>

<Container top={24}>
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
