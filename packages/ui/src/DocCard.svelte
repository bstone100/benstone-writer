<!--
  DocCard — a studio library card. Data contract (§11.2): handed only `id`; it
  reads its OWN title by path. Composes Card (surface) + Text (type). The parent
  supplies `href`, so the component stays routing-agnostic. The title carries the
  path-derived view-transition-name, so descending into the document morphs it
  into the editor's title for free (§12).
-->
<script lang="ts">
  import { untrack } from "svelte";
  import { read } from "@bw/data";
  import { P } from "@bw/schema";
  import { vtName } from "./motion";
  import Card from "./Card.svelte";
  import Text from "./Text.svelte";

  let { id, href }: { id: string; href: string } = $props();
  const title = untrack(() => read<string>(P.document(id).title));
</script>

<Card {href}>
  <Text family="serif" size="lg" weight={600} leading="snug">
    <span style:view-transition-name={vtName(P.document(id).title)}>{$title || "Untitled"}</span>
  </Text>
  <Text tone="faint" family="sans">→</Text>
</Card>
