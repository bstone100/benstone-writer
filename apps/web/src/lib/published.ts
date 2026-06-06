import { readFileSync, writeFileSync } from "node:fs";
import type { PublishedPost, PublishRequest } from "@bw/schema";

/**
 * Dev publish store — the SERVER-side index of published posts (§6 metadata).
 * In production this is Cloudflare D1; for local dev it's a small JSON file
 * (so posts survive Vite restarts) mirrored to a globalThis map (so they
 * survive HMR). Same tiny interface either way — upsert/get/list — so D1 swaps
 * in behind it at deploy. node:fs is dev-only; the D1 version ships to the edge.
 */
const FILE = new URL("../../.dev-published.json", import.meta.url);

function load(): Map<string, PublishedPost> {
  try {
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, PublishedPost>;
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

const store: Map<string, PublishedPost> = ((
  globalThis as { __bwPublished?: Map<string, PublishedPost> }
).__bwPublished ??= load());

function persist(): void {
  try {
    writeFileSync(FILE, JSON.stringify(Object.fromEntries(store), null, 2));
  } catch {
    /* dev-only; ignore */
  }
}

export function upsertPost(req: PublishRequest, publishedAt: number): PublishedPost {
  const post: PublishedPost = { ...req, publishedAt };
  store.set(post.slug, post);
  persist();
  return post;
}

export function getPost(slug: string): PublishedPost | undefined {
  return store.get(slug);
}

export function listPosts(): PublishedPost[] {
  return [...store.values()].sort((a, b) => b.publishedAt - a.publishedAt);
}
