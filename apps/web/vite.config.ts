import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
	plugins: [wasm(), sveltekit()],
	optimizeDeps: {
		// Automerge ships WASM; let Vite serve it raw (vite-plugin-wasm) instead of
		// pre-bundling, which breaks the WASM import. automerge-repo stays
		// pre-bundled (fixes eventemitter3's CJS default-import interop).
		exclude: ['@automerge/automerge']
	},
	build: { target: 'esnext' },
	worker: { plugins: () => [wasm()] }
});
