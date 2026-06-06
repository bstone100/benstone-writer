import type { RpcInput, RpcOutput } from "@bw/schema";
import { upsertPost, deletePost } from "$lib/published";
import { emitFeed } from "$lib/server/feed";

/**
 * Server-side RPC handlers (§14.1.B). One handler per verb in the RpcContract;
 * each receives already-zod-parsed input (validated at ingress by the generic
 * /api/rpc/[verb] endpoint against the schema contract) and returns the
 * contract's output type. Side effects (store + reader-feed notify) live here,
 * not in the route. At deploy `published`/`feed` swap to D1 + ReaderFeedDO
 * behind the same interface; these handlers don't change.
 */
export const handlers: { [V in "publish" | "unpublish"]: (input: RpcInput<V>) => RpcOutput<V> } = {
  publish(input) {
    const post = upsertPost(input, Date.now());
    emitFeed({ type: "published", slug: post.slug, updatedAt: post.publishedAt });
    return { slug: post.slug, publishedAt: post.publishedAt };
  },
  unpublish(input) {
    deletePost(input.slug);
    emitFeed({ type: "unpublished", slug: input.slug });
    return { ok: true };
  },
};
