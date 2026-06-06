import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FeedEvent } from "@bw/schema";

// Swap the D1-backed publish store for an in-memory one (deterministic, no real
// binding) — the feed stays REAL (env is undefined here, so notifyFeed routes to
// the in-process hub) so we assert the publish→reader-feed seam. The store fns
// take the DB binding first (unused here); the test passes no platform → env
// undefined → store called with db=undefined.
const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("$lib/published", () => ({
  upsertPost: async (_db: unknown, req: Record<string, unknown>, publishedAt: number) => {
    const post = { ...req, publishedAt };
    store.set(req.slug as string, post);
    return post;
  },
  getPost: async (_db: unknown, slug: string) => store.get(slug),
  deletePost: async (_db: unknown, slug: string) => {
    store.delete(slug);
  },
  listPosts: async () => [...store.values()],
}));

import { POST } from "./+server";
import { subscribeFeed } from "$lib/server/feed";

type Event = Parameters<typeof POST>[0];
function call(verb: string, body: unknown, owner: boolean = true) {
  const request = new Request(`http://localhost/api/rpc/${verb}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST({ params: { verb }, locals: { owner }, request } as unknown as Event);
}

const validPost = { slug: "s", title: "T", html: "<p>x</p>", excerpt: "x", sourceId: "d1" };

beforeEach(() => store.clear());

describe("RPC endpoint /api/rpc/[verb] — one door, zod-parsed at ingress (§14.1.B)", () => {
  it("401s a non-owner before anything else", async () => {
    await expect(call("publish", validPost, false)).rejects.toMatchObject({ status: 401 });
  });

  it("404s an unknown verb", async () => {
    await expect(call("frobnicate", {})).rejects.toMatchObject({ status: 404 });
  });

  it("400s malformed input (the schema rejects it before any handler)", async () => {
    await expect(call("publish", { slug: "only" })).rejects.toMatchObject({ status: 400 });
  });

  it("publish: stores the post, emits 'published', returns the slug", async () => {
    const events: FeedEvent[] = [];
    const unsub = subscribeFeed((e) => events.push(e));

    const res = await call("publish", validPost);
    const body = (await res.json()) as { slug: string; publishedAt: number };

    expect(body).toMatchObject({ slug: "s", publishedAt: expect.any(Number) });
    expect(store.get("s")).toMatchObject({ slug: "s", title: "T", sourceId: "d1" });
    expect(events).toEqual([{ type: "published", slug: "s", updatedAt: body.publishedAt }]);
    unsub();
  });

  it("unpublish: removes the post, emits 'unpublished', returns ok", async () => {
    store.set("s", { slug: "s" });
    const events: FeedEvent[] = [];
    const unsub = subscribeFeed((e) => events.push(e));

    const res = await call("unpublish", { slug: "s" });

    expect(await res.json()).toEqual({ ok: true });
    expect(store.has("s")).toBe(false);
    expect(events).toEqual([{ type: "unpublished", slug: "s" }]);
    unsub();
  });
});
