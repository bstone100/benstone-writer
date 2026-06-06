<script lang="ts">
  import { onMount } from "svelte";
  import { createDocument } from "@bw/data";
  import { Editor } from "@bw/ui";

  // Dev harness for the invisible editor: a single stable local document across
  // reloads (real routing — /studio, /writing/{slug} + inline edit — lands with
  // auth/publish, tasks #5–#7). Everything below the id is the real component.
  let id = $state<string | null>(null);

  onMount(() => {
    let existing = localStorage.getItem("editor-doc");
    if (!existing) {
      existing = createDocument({ title: "" });
      localStorage.setItem("editor-doc", existing);
    }
    id = existing;
  });
</script>

{#if id}
  <Editor {id} />
{/if}
