<!--
  Menu — the ⋮ context menu (§11.8, ROUND-2 R5): a trigger button that opens an
  accessible popover of actions (Make live / Restore to draft / Name version …).
  Built on the native Popover API, so top-layer stacking, light-dismiss (click
  outside) and Escape-to-close come from the platform; @floating-ui positions it
  under the trigger. Features pass `items`; this owns the trigger, positioning and
  keyboard nav — so no feature ever hand-rolls a popup.
-->
<script module lang="ts">
  export type MenuItem = { label: string; run: () => void; tone?: "default" | "danger" };
  let menuUid = 0;
</script>

<script lang="ts">
  import { computePosition, offset, flip, shift, autoUpdate } from "@floating-ui/dom";

  let { items, label = "More actions" }: { items: MenuItem[]; label?: string } = $props();
  const popoverId = `bw-menu-${menuUid++}`;
  let trigger = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  let stopAutoUpdate: (() => void) | undefined;

  function onToggle(e: Event): void {
    const opening = (e as ToggleEvent).newState === "open";
    if (opening && trigger && menu) {
      // Re-anchor under the trigger while open (scroll/resize safe).
      stopAutoUpdate = autoUpdate(trigger, menu, () => {
        if (!trigger || !menu) return;
        void computePosition(trigger, menu, {
          placement: "bottom-end",
          middleware: [offset(4), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          if (menu) {
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
          }
        });
      });
      queueMicrotask(() => menu?.querySelector<HTMLElement>("button.item")?.focus());
    } else {
      stopAutoUpdate?.();
      stopAutoUpdate = undefined;
    }
  }

  function choose(item: MenuItem): void {
    menu?.hidePopover();
    item.run();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = [...(menu?.querySelectorAll<HTMLElement>("button.item") ?? [])];
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown" ? Math.min(current + 1, buttons.length - 1) : Math.max(current - 1, 0);
    buttons[next]?.focus();
  }
</script>

<button
  bind:this={trigger}
  class="trigger"
  type="button"
  popovertarget={popoverId}
  aria-label={label}
  aria-haspopup="menu"
>⋮</button>

<div
  bind:this={menu}
  id={popoverId}
  popover="auto"
  class="menu"
  role="menu"
  tabindex="-1"
  ontoggle={onToggle}
  onkeydown={onKeydown}
>
  {#each items as item (item.label)}
    <button
      class="item"
      class:danger={item.tone === "danger"}
      type="button"
      role="menuitem"
      onclick={() => choose(item)}>{item.label}</button>
  {/each}
</div>

<style>
  .trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: var(--space-6);
    padding: 0 var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-ink-muted);
    font-size: var(--text-lg);
    line-height: 1;
    cursor: pointer;
  }
  .trigger:hover {
    background: color-mix(in srgb, var(--color-ink) 8%, transparent);
    color: var(--color-ink);
  }
  .menu {
    position: fixed;
    inset: auto;
    margin: 0;
    min-width: 12rem;
    padding: var(--space-1);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-md);
    background: var(--color-paper-raised);
    box-shadow: var(--shadow-popover);
  }
  .item {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-ink);
    cursor: pointer;
  }
  .item:hover,
  .item:focus-visible {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    outline: none;
  }
  .item.danger {
    color: var(--color-accent);
  }
</style>
