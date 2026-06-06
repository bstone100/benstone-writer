<script lang="ts">
	import '@bw/ui/tokens.css';
	import '@bw/ui/motion.css';
	import '@bw/ui/base.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
