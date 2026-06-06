// SSR-safe entry for the PUBLIC reading plane — exports ONLY what a reader
// needs (no editor, no ProseMirror, no CRDT), so `/writing/{slug}` server-renders
// and ships zero editor JS. Imported via `@bw/ui/reader`, never the barrel.
export { default as Reader } from "./Reader.svelte";
export { default as Prose } from "./Prose.svelte";
