<script lang="ts">
  import { Container, Stack, Heading, Text, Link } from "@bw/ui";
</script>

<svelte:head><title>Ben Stone</title></svelte:head>

<Container top={24}>
  <Stack gap={6}>
    <Heading level={1} size="3xl">Ben Stone</Heading>
    <Text size="lg" tone="muted" family="serif">Essays and notes.</Text>
    <Stack direction="row" gap={5}>
      <Link href="/writing" tone="accent">Writing →</Link>
    </Stack>
  </Stack>
</Container>
