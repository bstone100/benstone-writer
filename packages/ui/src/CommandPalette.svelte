<!--
  CommandPalette (§11.6, §11.8) — the ⌘K overlay: keyboard-first navigation +
  actions. Built on the native <dialog> element (showModal), so focus-trap,
  top-layer stacking, Esc-to-close, and the ::backdrop come from the platform —
  no hand-rolled a11y. Commands are passed in (the feature owns what they DO);
  this component owns the trigger, filtering, and keyboard nav.
-->
<script module lang="ts">
  export type Command = { id: string; label: string; hint?: string; run: () => void };
</script>

<script lang="ts">
  let { commands }: { commands: Command[] } = $props();

  let dialog = $state<HTMLDialogElement>();
  let query = $state("");
  let index = $state(0);

  const filtered = $derived(
    query.trim()
      ? commands.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()))
      : commands,
  );

  function open() {
    query = "";
    index = 0;
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
  function choose(c: Command) {
    close();
    c.run();
  }

  // Global ⌘K / Ctrl-K toggles the palette.
  function onGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (dialog?.open) close();
      else open();
    }
  }
  $effect(() => {
    window.addEventListener("keydown", onGlobalKeydown);
    return () => window.removeEventListener("keydown", onGlobalKeydown);
  });

  // List navigation (the input has focus while open).
  function onInputKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      index = Math.min(index + 1, filtered.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      index = Math.max(index - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[Math.min(index, filtered.length - 1)];
      if (c) choose(c);
    }
  }
  $effect(() => {
    void query; // reset highlight as the filter changes
    index = 0;
  });
</script>

<dialog
  bind:this={dialog}
  class="palette"
  onclose={() => (query = "")}
  onclick={(e) => {
    if (e.target === dialog) close(); // click on the backdrop
  }}
>
  <div class="panel">
    <!-- svelte-ignore a11y_autofocus -->
    <input
      class="q"
      type="text"
      placeholder="Type a command…"
      aria-label="Command palette"
      autocomplete="off"
      autofocus
      bind:value={query}
      onkeydown={onInputKeydown}
    />
    <ul class="list" role="listbox">
      {#each filtered as c, i (c.id)}
        <li>
          <button
            type="button"
            class="cmd"
            class:active={i === index}
            role="option"
            aria-selected={i === index}
            onmousedown={(e) => {
              e.preventDefault();
              choose(c);
            }}
            onmouseenter={() => (index = i)}
          >
            <span class="cmd-label">{c.label}</span>
            {#if c.hint}<span class="cmd-hint">{c.hint}</span>{/if}
          </button>
        </li>
      {/each}
      {#if filtered.length === 0}
        <li class="empty">No commands</li>
      {/if}
    </ul>
  </div>
</dialog>

<style>
  .palette {
    width: 32rem;
    max-width: 92vw;
    padding: 0;
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-lg);
    background: var(--color-paper-raised);
    color: var(--color-ink);
    box-shadow: 0 24px 64px color-mix(in srgb, var(--color-ink) 22%, transparent);
  }
  .palette::backdrop {
    background: color-mix(in srgb, var(--color-ink) 28%, transparent);
    backdrop-filter: blur(2px);
  }
  .panel {
    display: flex;
    flex-direction: column;
  }
  .q {
    padding: var(--space-4) var(--space-5);
    border: none;
    border-bottom: 1px solid var(--color-rule);
    outline: none;
    background: none;
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-lg);
  }
  .q::placeholder {
    color: var(--color-ink-faint);
  }
  .list {
    margin: 0;
    padding: var(--space-2);
    list-style: none;
    overflow-y: auto;
  }
  .cmd {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-base);
    text-align: left;
    cursor: pointer;
  }
  .cmd.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
  }
  .cmd-hint {
    color: var(--color-ink-faint);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
  .cmd.active .cmd-hint {
    color: var(--color-accent);
  }
  .empty {
    padding: var(--space-3);
    color: var(--color-ink-muted);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
  }
</style>
