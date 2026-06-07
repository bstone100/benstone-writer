<script lang="ts">
  import type { Snippet } from "svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { Bar, Stack, Link, Text, Button } from "@bw/ui/reader";
  import { session, clearOwner } from "$lib/owner.svelte";

  // The consistent site header (ROUND-2 R3/R7). Left: brand → home. Right: the
  // page's contextual owner actions (children) + the Log In ⇄ Log Out toggle. The
  // toggle reflects session state (out-of-band via /api/me) and NEVER disappears —
  // it flips between Log In (visitor) and Log Out (owner); owner controls sit
  // alongside it.
  let { children }: { children?: Snippet } = $props();

  async function logout() {
    await fetch("/auth/logout", { method: "POST" }); // clears the session cookie
    clearOwner();
    await invalidateAll(); // drop owner-only data from the loads
    void goto("/");
  }
</script>

<Bar edge="top" justify="between">
  <Link href="/" tone="muted"><Text size="sm" family="sans" tone="inherit">Ben Stone</Text></Link>
  <Stack direction="row" gap={4} align="center">
    {@render children?.()}
    {#if session.owner}
      <Button variant="link" onclick={logout}>Log out</Button>
    {:else}
      <Link href="/auth/login" tone="muted"><Text size="sm" family="sans" tone="inherit">Log in</Text></Link>
    {/if}
  </Stack>
</Bar>
