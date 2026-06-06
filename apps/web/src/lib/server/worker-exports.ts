// The named exports the Cloudflare runtime needs at the top of the DEPLOYED
// bundle (§15). The build-time merge (scripts/merge-worker.mjs) grafts these
// onto the adapter's default fetch export, so ONE Worker hosts the SvelteKit app
// AND the Durable Objects. Importing from @bw/api (a package) — not @automerge
// directly — keeps the CRDT/editor deps OUT of apps/web/src, so the import
// boundary (eslint.config.js) stays clean without an exemption.
export { SyncDocDO, ReaderFeedDO } from "@bw/api";
