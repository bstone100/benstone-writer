import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests for the correctness-critical logic across packages. Two flavours, both
// node-only + deterministic (no WASM/Svelte machinery pulled in):
//   • unit — co-located *.test.ts over pure functions (relative imports).
//   • integration — the server seams (auth gate, RPC endpoint, reader feed),
//     importing the real route handlers + server libs via the `$lib` alias below.
export default defineConfig({
  test: {
    include: ["{packages,workers,apps}/**/src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // SvelteKit's `$lib` — so integration tests can import the real server
      // modules (hooks, RPC handlers, feed) exactly as the app does.
      $lib: fileURLToPath(new URL("./apps/web/src/lib", import.meta.url)),
    },
  },
});
