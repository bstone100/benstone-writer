// The data layer is local-first (IndexedDB + Automerge), so this verification
// surface is client-only — never SSR'd. (Authoring surfaces are client islands
// per §11.6.)
export const ssr = false;
