import type { PublishedPost, PublishRequest } from "@bw/schema";

/**
 * Dev publish store — the SERVER-side index of published posts (§6 metadata).
 * In production this is Cloudflare D1; for local dev it's an in-process map
 * attached to globalThis so it survives Vite HMR. Same tiny interface either
 * way (upsert/get/list), so D1 swaps in behind it during the deploy pass.
 */
const store: Map<string, PublishedPost> = ((
  globalThis as { __bwPublished?: Map<string, PublishedPost> }
).__bwPublished ??= new Map());

export function upsertPost(req: PublishRequest, publishedAt: number): PublishedPost {
  const post: PublishedPost = { ...req, publishedAt };
  store.set(post.slug, post);
  return post;
}

export function getPost(slug: string): PublishedPost | undefined {
  return store.get(slug);
}

export function listPosts(): PublishedPost[] {
  return [...store.values()].sort((a, b) => b.publishedAt - a.publishedAt);
}
