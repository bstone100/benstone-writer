import { defineConfig } from "vitest/config";

// Unit tests for the correctness-critical PURE logic across packages. Co-located
// `*.test.ts` use relative imports, so no workspace-alias / WASM / Svelte
// machinery is pulled into the test run — fast, node-only, deterministic.
export default defineConfig({
  test: {
    include: ["{packages,workers,apps}/**/src/**/*.test.ts"],
    environment: "node",
  },
});
