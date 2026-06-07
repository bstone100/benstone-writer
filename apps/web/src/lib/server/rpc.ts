import type { RpcInput, RpcOutput, RpcVerb } from "@bw/schema";
import {
  makeLivePost,
  nameVersion as storeVersionName,
  getVersions,
  deletePost,
} from "$lib/published";
import { notifyFeed } from "$lib/server/feed";

/**
 * Server-side RPC handlers (§14.1.B, ROUND-2 R5). One handler per verb in the
 * RpcContract; each gets already-zod-parsed input (validated at ingress by the
 * generic /api/rpc/[verb] endpoint) + the Worker `env` (bindings). Side effects —
 * the D1 publish/version store + the ReaderFeedDO notify — live here, not in the
 * route. `env` is undefined under plain `vite dev`; the store/feed degrade.
 */
type Env = App.Platform["env"] | undefined;

export const handlers: {
  [V in RpcVerb]: (input: RpcInput<V>, env: Env) => Promise<RpcOutput<V>>;
} = {
  async makeLive(input, env) {
    const res = await makeLivePost(env?.DB, input, Date.now());
    await notifyFeed(env, { type: "published", id: res.id, updatedAt: res.publishedAt });
    return res;
  },
  async nameVersion(input, env) {
    await storeVersionName(env?.DB, input.id, input.heads, input.name, Date.now());
    return { ok: true };
  },
  async versions(input, env) {
    return getVersions(env?.DB, input.id);
  },
  async unpublish(input, env) {
    await deletePost(env?.DB, input.id);
    await notifyFeed(env, { type: "unpublished", id: input.id });
    return { ok: true };
  },
};
