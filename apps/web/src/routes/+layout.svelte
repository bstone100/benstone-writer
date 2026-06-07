<script lang="ts">
  import '@bw/ui/tokens.css';
  import '@bw/ui/motion.css';
  import '@bw/ui/base.css';
  import favicon from '$lib/assets/favicon.svg';
  import { onMount } from 'svelte';
  import { loadOwner } from '$lib/owner.svelte';

  let { children } = $props();

  // Resolve owner status ONCE for the whole app (out-of-band, client-side); every
  // owner-aware control reads the shared `session` store (ROUND-2 R3).
  onMount(() => {
    void loadOwner();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
