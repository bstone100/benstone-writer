import tseslint from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";

/**
 * Structural import boundaries (§11.1, §11.7) — the "one data door", enforced.
 * A violation FAILS lint (and CI), so the wrong shape can't merge; it's no longer
 * a convention. Deliberately minimal: this config exists to enforce the
 * architecture's boundaries, not to impose a general style regime.
 */

// §11.2: a component takes a path/id and read()s its own data — props carry
// identity, never a local-store entity. Importing the `Document` (local-store)
// type into feature/UI code is the banned shape: if you can't name the type, you
// can't drill `doc: Document` down through props; you pass `P.document(id)` and
// the component owns its subscription. (SSR projections like PublishedPost are
// explicitly fine — the public reader has no client store to subscribe to, so it
// receives server-rendered data by design, §9/§11.5.)
const NO_LOCAL_ENTITY_PROP = {
  name: "@bw/schema",
  importNames: ["Document"],
  message:
    "§11.2: pass a path/id and read() your own data — never a local-store entity. Import P.document(id), not the Document type. (SSR projections like PublishedPost are fine.)",
};

// Features (apps/web): may only reach data/UI through @bw/* — never CRDT/editor
// internals directly.
const FEATURE_BOUNDARY = {
  paths: [NO_LOCAL_ENTITY_PROP],
  patterns: [
    {
      group: ["@automerge/*", "prosemirror", "prosemirror-*", "cborg", "@bw/data/*"],
      message:
        "Features must go through @bw/data, @bw/ui, @bw/schema — no direct CRDT/editor/wire deps (§11.1, one data door).",
    },
  ],
};

// Features write NO CSS (§11.3/§11.8). A `<style>` block in apps/web is the
// banned shape: features compose @bw/ui primitives, and every raw value lives in
// @bw/ui (where tokens + Stylelint govern it). esquery matches the Svelte
// parser's style-element node, so adding a <style> to a feature FAILS lint → CI.
const NO_FEATURE_CSS = {
  selector: "SvelteStyleElement",
  message:
    "Features write no CSS (§11.3/§11.8). Compose @bw/ui primitives; if a new style is genuinely needed, add or extend a component in packages/ui — never style here.",
};

// The component library (packages/ui): composes @bw/data + @automerge/prosemirror
// (the editor binding), but must NOT touch automerge-repo/automerge directly —
// that's data/'s job.
const UI_BOUNDARY = {
  paths: [NO_LOCAL_ENTITY_PROP],
  patterns: [
    {
      group: ["@automerge/automerge", "@automerge/automerge-repo", "@automerge/automerge-repo-*", "cborg"],
      message:
        "Only @bw/data may import automerge-repo/automerge (§11.1). The editor composes @bw/data + @automerge/prosemirror.",
    },
  ],
};

export default [
  {
    ignores: [
      "**/.svelte-kit/**",
      "**/dist/**",
      "**/build/**",
      "**/.wrangler/**",
      "**/node_modules/**",
      "**/*.config.{js,ts}",
      "**/vite.config.ts",
    ],
  },
  {
    files: ["**/*.{ts,js}"],
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2023, sourceType: "module" },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tseslint.parser },
      ecmaVersion: 2023,
      sourceType: "module",
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,svelte}"],
    rules: {
      "no-restricted-imports": ["error", FEATURE_BOUNDARY],
      "no-restricted-syntax": ["error", NO_FEATURE_CSS],
    },
  },
  {
    files: ["packages/ui/src/**/*.{ts,svelte}"],
    rules: { "no-restricted-imports": ["error", UI_BOUNDARY] },
  },
];
