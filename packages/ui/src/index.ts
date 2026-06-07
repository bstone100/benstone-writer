// @bw/ui — the ONE component library + design system (§11.3). Tokens live in
// ./tokens.css (imported once, globally); components compose tokens and never
// hard-code raw values. Features compose THESE — they write no CSS themselves
// (enforced: see eslint.config.js no-`<style>` rule + stylelint.config.js).

// ---- Primitives: the design-system vocabulary features are built from.
export { default as Container } from "./Container.svelte";
export { default as Stack } from "./Stack.svelte";
export { default as Grid } from "./Grid.svelte";
export { default as Text } from "./Text.svelte";
export { default as Heading } from "./Heading.svelte";
export { default as Button } from "./Button.svelte";
export { default as Link } from "./Link.svelte";
export { default as Card } from "./Card.svelte";
export { default as Bar } from "./Bar.svelte";
export { default as CommandPalette, type Command } from "./CommandPalette.svelte";
export { default as Menu, type MenuItem } from "./Menu.svelte";

// ---- Composed, data-aware components.
export { default as Editor } from "./Editor.svelte";
export { default as History } from "./History.svelte";
export { default as BranchPicker } from "./BranchPicker.svelte";
export { default as DocCard } from "./DocCard.svelte";
export { default as Reader } from "./Reader.svelte";
export { default as Prose } from "./Prose.svelte";

export { placeholder } from "./placeholder";
export { renderForPublish } from "./render";
export { vtName, transitionKind, type TransitionKind } from "./motion";
