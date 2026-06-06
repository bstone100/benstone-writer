<script lang="ts">
  import { onNavigate } from "$app/navigation";
  import { transitionKind } from "@bw/ui/motion";

  let { children } = $props();

  // Map a studio URL to its DATA path, so the transition is derived from the
  // data hierarchy (§12) rather than the route string:
  //   /studio        → documents          (the collection)
  //   /studio/{id}   → documents/{id}     (one document — a level deeper)
  function routeToPath(url: URL): string[] | null {
    const m = url.pathname.match(/^\/studio(?:\/([^/]+))?\/?$/);
    if (!m) return null;
    return m[1] ? ["documents", m[1]] : ["documents"];
  }

  // ONE hook turns every studio navigation into a path-derived transition: the
  // motion is a function of (fromPath, toPath), declared here and nowhere else.
  onNavigate((nav) => {
    if (typeof document === "undefined" || !document.startViewTransition) return;
    if (!nav.from || !nav.to) return;
    const from = routeToPath(nav.from.url);
    const to = routeToPath(nav.to.url);
    if (!from || !to) return; // entering/leaving the studio: let it be a plain nav

    const root = document.documentElement;
    root.dataset.vtKind = transitionKind(from, to);
    return new Promise<void>((resolve) => {
      const transition = document.startViewTransition(async () => {
        resolve();
        await nav.complete;
      });
      void transition.finished.finally(() => {
        delete root.dataset.vtKind;
      });
    });
  });
</script>

{@render children()}
