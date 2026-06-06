import tseslint from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";

/**
 * Structural import boundaries (§11.1, §11.7) — the "one data door", enforced.
 * A violation FAILS lint (and CI), so the wrong shape can't merge; it's no longer
 * a convention. Deliberately minimal: this config exists to enforce the
 * architecture's boundaries, not to impose a general style regime.
 */

// Features (apps/web): may only reach data/UI through @bw/* — never CRDT/editor
// internals directly.
const FEATURE_BOUNDARY = {
  patterns: [
    {
      group: ["@automerge/*", "prosemirror", "prosemirror-*", "cborg", "@bw/data/*"],
      message:
        "Features must go through @bw/data, @bw/ui, @bw/schema — no direct CRDT/editor/wire deps (§11.1, one data door).",
    },
  ],
};

// The component library (packages/ui): composes @bw/data + @automerge/prosemirror
// (the editor binding), but must NOT touch automerge-repo/automerge directly —
// that's data/'s job.
const UI_BOUNDARY = {
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
    rules: { "no-restricted-imports": ["error", FEATURE_BOUNDARY] },
  },
  {
    files: ["packages/ui/src/**/*.{ts,svelte}"],
    rules: { "no-restricted-imports": ["error", UI_BOUNDARY] },
  },
];
