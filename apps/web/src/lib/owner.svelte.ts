// ONE shared source of truth for "is the current visitor the site owner",
// resolved out-of-band via /api/me so public pages stay cacheable (§11.5, R3).
// The root layout calls loadOwner() once on mount; every owner-aware control
// reads `session.owner` reactively — no prop-drilling, one fetch.
//
// SSR-safe: loadOwner() is only ever called client-side (layout onMount), so the
// module-level state is never mutated on the server — SSR always renders the safe
// `owner: false` default (identical HTML for everyone), and each browser sets its
// own state after hydration.
let ownerState = $state(false);
let loadedState = $state(false);

export const session = {
  get owner() {
    return ownerState;
  },
  /** True once /api/me has resolved (so UI can avoid a flash before it's known). */
  get loaded() {
    return loadedState;
  },
};

let inflight: Promise<void> | undefined;

export function loadOwner(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetch("/api/me")
    .then((r) => r.json() as Promise<{ owner?: boolean }>)
    .then((m) => {
      ownerState = !!m.owner;
    })
    .catch(() => {
      ownerState = false;
    })
    .finally(() => {
      loadedState = true;
    });
  return inflight;
}

/** Reset to logged-out after Log Out, without a full reload. */
export function clearOwner(): void {
  ownerState = false;
  loadedState = true;
  inflight = undefined;
}
