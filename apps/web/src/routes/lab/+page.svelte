<script lang="ts">
  import { onMount } from "svelte";
  import { read, mutate, createDocument } from "@bw/data";
  import { P } from "@bw/schema";

  let id = $state<string | null>(null);
  let title = $state<string | undefined>(undefined);

  onMount(() => {
    // Stable doc id across reloads → proves local-first persistence (IndexedDB).
    let existing = localStorage.getItem("lab-doc");
    if (!existing) {
      existing = createDocument({ title: "Hello, local-first." });
      localStorage.setItem("lab-doc", existing);
    }
    id = existing;
    const titleStore = read<string>(P.document(existing).title);
    const unsub = titleStore.subscribe((v) => (title = v));
    return unsub;
  });

  function onInput(e: Event) {
    if (!id) return;
    const v = (e.target as HTMLInputElement).value;
    mutate(P.document(id).root, (doc) => {
      doc.title = v;
      doc.updatedAt = Date.now();
    });
  }
</script>

<main>
  <h1>data layer lab</h1>
  <p>doc id: <code>{id ?? "…"}</code></p>
  <label>
    edit the title, then <strong>reload</strong> — it persists with no server:
    <input value={title ?? ""} oninput={onInput} />
  </label>
  <p>live read of <code>documents/&lt;id&gt;/title</code>: <strong>{title ?? "…"}</strong></p>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    max-width: 40rem;
    margin: 4rem auto;
    padding: 0 1rem;
    line-height: 1.6;
  }
  input {
    display: block;
    width: 100%;
    font-size: 1.25rem;
    padding: 0.5rem;
    margin-top: 0.5rem;
  }
  code {
    background: #f0f0f0;
    padding: 0 0.25rem;
    border-radius: 3px;
  }
</style>
