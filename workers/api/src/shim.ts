// MUST be imported FIRST — before any `@automerge/*` import is evaluated — so
// the Automerge WASM always sees a `performance` global (§8.1). Modern workerd
// provides one, so this is belt-and-suspenders, but it mirrors mergeparty and
// costs nothing.
const g = globalThis as unknown as { performance?: { now(): number } };
g.performance ??= { now: () => Date.now() };
