import "./shim"; // perf shim BEFORE automerge loads (transitively via sync-do).

/**
 * @bw/api — the sync/feed Durable Object library (§8.1, §14.1.E). Formerly a
 * standalone Worker; now it exports its DO classes so the ONE SvelteKit Worker
 * (apps/web) can host them (build-time export merge → §15: one Worker, one
 * origin, so the WS upgrade carries the Cloudflare Access cookie). The HTTP
 * routing that used to live here is now the app's `/sync/[id]` route + the
 * publish RPC; this package is just the DO implementations + their deps.
 */
export { SyncDocDO } from "./sync-do";
export { ReaderFeedDO } from "./reader-feed-do";
export type { Env } from "./sync-do";
