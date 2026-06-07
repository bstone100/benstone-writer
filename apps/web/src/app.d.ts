/// <reference types="@cloudflare/workers-types" />
// The Cloudflare bindings available to server code via `event.platform.env`
// (§14.1). DO namespaces are generically typed off @bw/api's classes (type-only
// import → erased, no automerge at runtime) so the stubs carry their RPC methods.
import type { SyncDocDO, ReaderFeedDO } from "@bw/api";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** True only for the site owner (a verified GitHub session, ROUND-2 R3). */
			owner: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				DOC_STORE: R2Bucket;
				SYNC_DOC: DurableObjectNamespace<SyncDocDO>;
				READER_FEED: DurableObjectNamespace<ReaderFeedDO>;
				ASSETS: Fetcher;
				SESSION_SECRET: string;
				GITHUB_CLIENT_ID: string;
				GITHUB_CLIENT_SECRET: string;
			};
			ctx: ExecutionContext;
			cf?: CfProperties;
			caches: CacheStorage;
		}
	}
}

export {};
