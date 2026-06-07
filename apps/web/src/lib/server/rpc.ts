import type { RpcInput, RpcOutput } from "@bw/schema";
import { upsertPost, deletePost } from "$lib/published";
import { notifyFeed } from "$lib/server/feed";

/**
 * Server-side RPC handlers (§14.1.B). One handler per verb in the RpcContract;
 * each receives already-zod-parsed input (validated at ingress by the generic
 * /api/rpc/[verb] endpoint) plus the Worker `env` (bindings). Side effects —
 * the D1 publish store + the ReaderFeedDO notify — live here, not in the route.
 * `env` is undefined under plain `vite dev`; the store/feed degrade accordingly.
 */
type Env = App.Platform["env"] | undefined;

export const handlers: {
  [V in "publish" | "unpublish"]: (input: RpcInput<V>, env: Env) => Promise<RpcOutput<V>>;
} = {
  async publish(input, env) {
    const post = await upsertPost(env?.DB, input, Date.now());
    await notifyFeed(env, { type: "published", id: post.id, updatedAt: post.publishedAt });
    return { id: post.id, publishedAt: post.publishedAt };
  },
  async unpublish(input, env) {
    await deletePost(env?.DB, input.id);
    await notifyFeed(env, { type: "unpublished", id: input.id });
    return { ok: true };
  },
};
