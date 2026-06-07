<!--
  History — the version panel (§3.3, ROUND-2 R5). ONE LINEAR history: the
  Automerge change DAG folded into coarse edit-sessions, newest first. Every item
  carries a ⋮ Menu — Make live / Restore to draft / Name version — exactly like
  Google Docs. A crown marks the LIVE version (what the public sees); a vN badge
  marks a released version; an optional name labels it.

  Reads only the LOCAL change DAG (history/documentAt). The imperative actions are
  the parent's callbacks: the server owns the live pointer and the monotonic vN
  counter (a CRDT can't do a strict counter), so this panel never calls it — it
  raises onMakeLive/onRestore/onName and the parent (which holds the RPC client)
  performs them, then re-feeds `liveHeads`/`versions`.

  Data contract (§11.2): `id` is identity; `liveHeads`/`versions` are the server's
  version metadata, passed in (and refreshed by the parent after an action).
-->
<script lang="ts">
  import { untrack } from "svelte";
  import { history, documentAt, type HistoryEntry, type Snapshot } from "@bw/data";
  import type { VersionMeta } from "@bw/schema";
  import Menu, { type MenuItem } from "./Menu.svelte";
  import Prose from "./Prose.svelte";

  let {
    id,
    liveHeads = null,
    versions = [],
    onMakeLive,
    onRestore,
    onName,
    onclose,
  }: {
    id: string;
    liveHeads?: string[] | null;
    versions?: VersionMeta[];
    onMakeLive?: (heads: string[]) => void;
    onRestore?: (heads: string[]) => void;
    onName?: (heads: string[], name: string) => void;
    onclose?: () => void;
  } = $props();

  // Mounted per-document; id is stable for the panel's lifetime.
  const entries = untrack(() => history(id));
  // Newest first for reading; the DAG is oldest → newest.
  const sessions = $derived([...$entries].reverse());

  // A version is a SET of heads — compare order-independently.
  const keyOf = (heads: string[]) => [...heads].sort().join("\n");
  const liveKey = $derived(liveHeads ? keyOf(liveHeads) : null);
  const metaByKey = $derived(new Map(versions.map((v) => [keyOf(v.heads), v] as const)));
  const isLive = (s: HistoryEntry) => liveKey !== null && keyOf(s.heads) === liveKey;

  // Selection drives the read-only preview of the chosen version.
  let selected = $state<HistoryEntry | null>(null);
  let snapshot = $state<Snapshot | null>(null);
  async function select(entry: HistoryEntry) {
    selected = entry;
    snapshot = await documentAt(id, entry.heads);
  }
  // Open on the latest version.
  $effect(() => {
    if (!selected && sessions.length) void select(sessions[0]);
  });

  // "Name version" — a clean inline field in the footer (no browser prompt).
  let naming = $state<HistoryEntry | null>(null);
  let nameDraft = $state("");
  function beginName(s: HistoryEntry) {
    void select(s);
    naming = s;
    nameDraft = metaByKey.get(keyOf(s.heads))?.name ?? "";
  }
  function saveName() {
    if (naming) onName?.(naming.heads, nameDraft.trim());
    naming = null;
  }
  function autofocus(node: HTMLElement) {
    node.focus();
  }

  // The ⋮ menu for one history item. Make live is hidden on the live version;
  // Restore is hidden on the current draft (restoring HEAD to itself is a no-op).
  function itemsFor(s: HistoryEntry, head: boolean): MenuItem[] {
    const items: MenuItem[] = [];
    if (!isLive(s)) items.push({ label: "Make live", run: () => onMakeLive?.(s.heads) });
    if (!head) items.push({ label: "Restore to draft", run: () => onRestore?.(s.heads) });
    const named = metaByKey.get(keyOf(s.heads))?.name;
    items.push({ label: named ? "Rename version" : "Name version", run: () => beginName(s) });
    return items;
  }

  const fmt = (t: number) =>
    new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
</script>

<div class="history">
  <aside class="rail">
    <header>
      <h2>Version history</h2>
      <button class="done" onclick={() => onclose?.()}>Done</button>
    </header>
    {#if sessions.length === 0}
      <p class="hint">No history yet — start writing.</p>
    {:else}
      <ol>
        {#each sessions as s, i (s.heads[0])}
          {@const meta = metaByKey.get(keyOf(s.heads))}
          <li class="row" class:active={selected?.heads[0] === s.heads[0]}>
            <button class="entry" onclick={() => select(s)}>
              <span class="dot" class:live={isLive(s)}></span>
              <span class="when">{fmt(s.time)}</span>
              <span class="meta">
                {#if meta?.name}{meta.name}{:else if i === 0}Current draft{:else}{s.changeCount}
                  edit{s.changeCount === 1 ? "" : "s"}{/if}
              </span>
            </button>
            <div class="badges">
              {#if isLive(s)}<span class="crown" role="img" aria-label="Live version">👑</span>{/if}
              {#if meta?.version != null}<span class="vtag">v{meta.version}</span>{/if}
              <Menu items={itemsFor(s, i === 0)} label="Version actions" />
            </div>
          </li>
        {/each}
      </ol>
    {/if}
  </aside>

  <section class="stage">
    {#if snapshot}
      <div class="preview">
        <Prose>
          <h1 class="ptitle">{snapshot.title || "Untitled"}</h1>
          {#each snapshot.paragraphs as p, i (i)}
            <p>{p}</p>
          {/each}
          {#if snapshot.paragraphs.length === 0}<p class="faint">— empty —</p>{/if}
        </Prose>
      </div>
      {#if naming}
        <footer class="namebar">
          <input
            class="nameinput"
            placeholder="Name this version"
            bind:value={nameDraft}
            use:autofocus
            onkeydown={(e) => {
              if (e.key === "Enter") saveName();
              else if (e.key === "Escape") naming = null;
            }}
          />
          <button class="primary" onclick={saveName}>Save</button>
          <button class="ghost" onclick={() => (naming = null)}>Cancel</button>
        </footer>
      {:else}
        <footer class="status">
          {#if selected && isLive(selected)}
            <span class="reading"><span class="crown" role="img" aria-label="Live">👑</span> This version is live</span>
          {:else}
            <span class="reading">Read-only preview — use the ⋮ menu to make live or restore</span>
          {/if}
        </footer>
      {/if}
    {/if}
  </section>
</div>

<style>
  .history {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: 19rem 1fr;
    background: var(--color-paper);
  }

  /* Version rail */
  .rail {
    border-right: 1px solid var(--color-rule);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .rail header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: var(--space-5) var(--space-5) var(--space-3);
  }
  .rail h2 {
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-ink-muted);
  }
  .done {
    border: none;
    background: none;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-accent);
    padding: 0;
  }
  .hint {
    padding: 0 var(--space-5);
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
  }
  .rail ol {
    list-style: none;
    margin: 0;
    padding: 0 var(--space-3) var(--space-5);
    overflow-y: auto;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding-right: var(--space-1);
    border-radius: var(--radius-md);
  }
  .row:hover {
    background: color-mix(in srgb, var(--color-accent) 7%, transparent);
  }
  .row.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .entry {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas: "dot when" "dot meta";
    column-gap: var(--space-3);
    align-items: center;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    padding: var(--space-2) var(--space-3);
    color: var(--color-ink);
  }
  .dot {
    grid-area: dot;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-ink-faint);
  }
  .dot.live {
    background: var(--color-accent);
  }
  .row.active .dot {
    background: var(--color-accent);
  }
  .when {
    grid-area: when;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
  }
  .meta {
    grid-area: meta;
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--color-ink-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badges {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }
  .crown {
    font-size: var(--text-sm);
    line-height: 1;
  }
  .vtag {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-accent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    border-radius: var(--radius-pill);
    padding: 0 var(--space-2);
  }

  /* Preview stage */
  .stage {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .preview {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-16) var(--space-6) var(--space-12);
  }
  .ptitle {
    font-size: var(--text-3xl);
    font-weight: 700;
    line-height: var(--leading-tight);
    letter-spacing: -0.018em;
    margin: 0 0 var(--space-5);
  }
  .faint {
    color: var(--color-ink-faint);
  }
  .status,
  .namebar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-8);
    border-top: 1px solid var(--color-rule);
    background: var(--color-paper);
  }
  .reading {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
  }
  .nameinput {
    flex: 1;
    min-width: 0;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-ink);
    background: var(--color-paper-raised);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }
  .nameinput:focus {
    outline: none;
    border-color: var(--color-accent);
  }
  .primary {
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: var(--color-paper-raised);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .ghost {
    border: none;
    background: none;
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    padding: var(--space-2);
    cursor: pointer;
  }

  @media (max-width: 40rem) {
    .history {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }
    .rail {
      border-right: none;
      border-bottom: 1px solid var(--color-rule);
      max-height: 40vh;
    }
  }
</style>
