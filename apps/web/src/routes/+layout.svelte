<script lang="ts">
	import '@bw/ui/tokens.css';
	import '@bw/ui/motion.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	/* App canvas — warm paper, ink text, sans by default. The reading/writing
	   column (serif) is established by Prose where long-form content lives. */
	:global(html) {
		background: var(--color-paper);
	}
	:global(body) {
		margin: 0;
		background: var(--color-paper);
		color: var(--color-ink);
		font-family: var(--font-sans);
		-webkit-font-smoothing: antialiased;
	}
</style>
