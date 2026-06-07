// SSR-safe entry for the PUBLIC reading plane — exports ONLY what a reader
// needs (no editor, no ProseMirror, no CRDT), so `/documents/{id}` server-renders
// and ships zero editor JS. Imported via `@bw/ui/reader`, never the barrel.
export { default as Reader } from "./Reader.svelte";
export { default as Prose } from "./Prose.svelte";

// Pure presentational primitives (no @bw/data, no editor) — so the reader plane,
// incl. the owner-only inline-edit chrome (§11.5), composes the design system
// without pulling the editor bundle. The Editor itself is dynamically imported
// from the barrel only behind the owner check.
export { default as Container } from "./Container.svelte";
export { default as Stack } from "./Stack.svelte";
export { default as Grid } from "./Grid.svelte";
export { default as Text } from "./Text.svelte";
export { default as Heading } from "./Heading.svelte";
export { default as Button } from "./Button.svelte";
export { default as Link } from "./Link.svelte";
export { default as Card } from "./Card.svelte";
export { default as Bar } from "./Bar.svelte";
