<script lang="ts">
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Container, Stack, Heading, Text, Link } from "@bw/ui";
  import { vtName } from "@bw/ui/motion";
  import { P } from "@bw/schema";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();

  // Live (§7 #5): any publish refreshes the index in place — no reload/poll.
  onMount(() => {
    const es = new EventSource("/api/feed");
    const refresh = () => void invalidateAll(); // publish adds a post, unpublish removes one
    es.addEventListener("published", refresh);
    es.addEventListener("unpublished", refresh);
    return () => es.close();
  });
</script>

<svelte:head>
  <title>Writing — Ben Stone</title>
</svelte:head>

<Container top={24}>
  <Stack gap={10}>
    <Heading level={1}>Writing</Heading>

    {#if data.posts.length === 0}
      <Text tone="muted" family="serif">Nothing published yet.</Text>
    {:else}
      <Stack as="nav" divided>
        {#each data.posts as post (post.slug)}
          <Link href={`/writing/${post.slug}`} block py={5}>
            <Stack gap={1}>
              <Text size="lg" weight={600} family="serif" tone="inherit">
                <span style:view-transition-name={vtName(P.published(post.slug))}>
                  {post.title || "Untitled"}
                </span>
              </Text>
              {#if post.excerpt}<Text family="serif" tone="muted" leading="snug">{post.excerpt}</Text>{/if}
            </Stack>
          </Link>
        {/each}
      </Stack>
    {/if}
  </Stack>
</Container>
