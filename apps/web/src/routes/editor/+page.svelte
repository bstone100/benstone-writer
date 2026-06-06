<script lang="ts">
  import { onMount } from "svelte";
  import { createDocument } from "@bw/data";
  import { Editor, History, renderForPublish } from "@bw/ui";

  // Dev harness for the invisible editor. `?doc={id}` opens a specific document
  // (a second view / another device → proves cloud sync); otherwise a single
  // stable local doc across reloads. Real routing lands with auth/publish.
  let id = $state<string | null>(null);
  let showHistory = $state(false);

  onMount(() => {
    const fromUrl = new URLSearchParams(location.search).get("doc");
    if (fromUrl) {
      id = fromUrl;
      return;
    }
    let existing = localStorage.getItem("editor-doc");
    if (!existing) {
      existing = createDocument({ title: "" });
      localStorage.setItem("editor-doc", existing);
    }
    id = existing;
  });

  function onBranch(newId: string) {
    id = newId; // switch to editing the fresh branch
    showHistory = false;
  }

  let publishing = $state(false);
  async function publish() {
    if (!id || publishing) return;
    publishing = true;
    try {
      const req = await renderForPublish(id); // render to static HTML, client-side
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const { slug } = (await res.json()) as { slug: string };
        window.open(`/writing/${slug}`, "_blank");
      }
    } finally {
      publishing = false;
    }
  }
</script>

{#if id}
  {#key id}
    <Editor {id} />
  {/key}

  {#if showHistory}
    <History {id} onbranch={onBranch} onclose={() => (showHistory = false)} />
  {/if}

  <footer class="devbar">
    doc <code>{id}</code>
    · <button class="link" onclick={() => (showHistory = true)}>history</button>
    · <button class="link" onclick={publish} disabled={publishing}>{publishing ? "publishing…" : "publish ↗"}</button>
    · <a href={`/editor?doc=${id}`} target="_blank" rel="noreferrer">open 2nd view ↗</a>
  </footer>
{/if}

<style>
  .devbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-ink-muted);
    background: color-mix(in srgb, var(--color-paper) 86%, transparent);
    border-top: 1px solid var(--color-rule);
    padding: var(--space-2) var(--space-4);
    backdrop-filter: blur(6px);
  }
  .devbar code {
    color: var(--color-ink);
  }
  .devbar a,
  .devbar .link {
    color: var(--color-accent);
  }
  .link {
    border: none;
    background: none;
    font: inherit;
    cursor: pointer;
    padding: 0;
  }
</style>
