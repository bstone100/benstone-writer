<!--
  History — time-travel through a document's change DAG (§8). Lists edit-sessions
  (the fine-grained Automerge changes folded into coarse sessions), previews the
  document read-only at any past point, and forks a branch from there
  ("continue from here"). Nothing here mutates or deletes — it only reads views
  and creates new branch documents.

  Data contract (§11.2): the only prop is `id`. History/preview/branch all come
  from the path-data layer by id; this component holds no domain data as props.
-->
<script lang="ts">
  import { untrack } from "svelte";
  import { history, documentAt, branchFrom, type HistoryEntry, type Snapshot } from "@bw/data";
  import Prose from "./Prose.svelte";

  let {
    id,
    onbranch,
    onclose,
  }: {
    id: string;
    onbranch?: (newId: string) => void;
    onclose?: () => void;
  } = $props();

  // History is mounted per-document; the id prop is stable for its lifetime
  // (the parent closes History before switching docs), so snapshot it at mount.
  const entries = untrack(() => history(id));
  let selected = $state<HistoryEntry | null>(null);
  let snapshot = $state<Snapshot | null>(null);
  let branching = $state(false);

  // Newest first for reading; the change DAG is oldest→newest.
  const sessions = $derived([...$entries].reverse());

  async function select(entry: HistoryEntry) {
    selected = entry;
    snapshot = await documentAt(id, entry.heads);
  }

  // Open on the latest version.
  $effect(() => {
    if (!selected && sessions.length) void select(sessions[0]);
  });

  async function continueHere() {
    if (!selected || branching) return;
    branching = true;
    try {
      onbranch?.(await branchFrom(id, selected.heads));
    } finally {
      branching = false;
    }
  }

  const fmt = (t: number) =>
    new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
</script>

<div class="history">
  <aside class="rail">
    <header>
      <h2>History</h2>
      <button class="done" onclick={() => onclose?.()}>Done</button>
    </header>
    {#if sessions.length === 0}
      <p class="hint">No history yet — start writing.</p>
    {:else}
      <ol>
        {#each sessions as s, i (s.heads[0])}
          <li>
            <button
              class="entry"
              class:active={selected?.heads[0] === s.heads[0]}
              onclick={() => select(s)}
            >
              <span class="dot"></span>
              <span class="when">{fmt(s.time)}</span>
              <span class="meta">{i === 0 ? "latest" : `${s.changeCount} edit${s.changeCount === 1 ? "" : "s"}`}</span>
            </button>
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
          {#if snapshot.paragraphs.length === 0}
            <p class="faint">— empty —</p>
          {/if}
        </Prose>
      </div>
      <footer class="actions">
        <span class="reading">Reading a past version (read-only)</span>
        <button class="branch" onclick={continueHere} disabled={branching}>
          {branching ? "Forking…" : "Continue from here ↗"}
        </button>
      </footer>
    {/if}
  </section>
</div>

<style>
  .history {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: 17rem 1fr;
    background: var(--color-paper);
  }

  /* Timeline rail */
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
  .entry {
    width: 100%;
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
    border-radius: var(--radius-md);
    color: var(--color-ink);
  }
  .entry:hover {
    background: color-mix(in srgb, var(--color-accent) 7%, transparent);
  }
  .entry.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .dot {
    grid-area: dot;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-ink-faint);
  }
  .entry.active .dot {
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
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-8);
    border-top: 1px solid var(--color-rule);
    background: var(--color-paper);
  }
  .reading {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-ink-muted);
  }
  .branch {
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
  .branch:disabled {
    opacity: 0.6;
    cursor: default;
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
