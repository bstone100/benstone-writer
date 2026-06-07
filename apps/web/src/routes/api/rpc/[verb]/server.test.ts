import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FeedEvent } from "@bw/schema";

// Swap the D1-backed publish/version store for an in-memory one (deterministic, no
// real binding) — the feed stays REAL (env is undefined here, so notifyFeed routes
// to the in-process hub) so we assert the makeLive→reader-feed seam. The store fns
// take the DB binding first (unused here); the test passes no platform → env
// undefined → store called with db=undefined. Keyed by document id (R5).
const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("$lib/published", () => ({
  makeLivePost: async (_db: unknown, req: Record<string, unknown>, publishedAt: number) => {
    store.set(req.id as string, { ...req, publishedAt });
    return { id: req.id as string, version: 1, publishedAt };
  },
  nameVersion: async () => {},
  getVersions: async (_db: unknown, id: string) => ({
    liveHeads: store.has(id) ? ["h1"] : null,
    versions: [],
  }),
  getPost: async (_db: unknown, id: string) => store.get(id),
  deletePost: async (_db: unknown, id: string) => {
    store.delete(id);
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

const validMakeLive = { id: "d1", title: "T", html: "<p>x</p>", excerpt: "x", heads: ["h1"] };

beforeEach(() => store.clear());

describe("RPC endpoint /api/rpc/[verb] — one door, zod-parsed at ingress (§14.1.B / R5)", () => {
  it("401s a non-owner before anything else", async () => {
    await expect(call("makeLive", validMakeLive, false)).rejects.toMatchObject({ status: 401 });
  });

  it("404s an unknown verb", async () => {
    await expect(call("frobnicate", {})).rejects.toMatchObject({ status: 404 });
  });

  it("400s malformed input (the schema rejects it before any handler)", async () => {
    await expect(call("makeLive", { id: "only" })).rejects.toMatchObject({ status: 400 });
  });

  it("makeLive: stores the projection, emits 'published', returns id + version", async () => {
    const events: FeedEvent[] = [];
    const unsub = subscribeFeed((e) => events.push(e));

    const res = await call("makeLive", validMakeLive);
    const body = (await res.json()) as { id: string; version: number; publishedAt: number };

    expect(body).toMatchObject({ id: "d1", version: expect.any(Number), publishedAt: expect.any(Number) });
    expect(store.get("d1")).toMatchObject({ id: "d1", title: "T" });
    expect(events).toEqual([{ type: "published", id: "d1", updatedAt: body.publishedAt }]);
    unsub();
  });

  it("unpublish: removes the post, emits 'unpublished', returns ok", async () => {
    store.set("d1", { id: "d1" });
    const events: FeedEvent[] = [];
    const unsub = subscribeFeed((e) => events.push(e));

    const res = await call("unpublish", { id: "d1" });

    expect(await res.json()).toEqual({ ok: true });
    expect(store.has("d1")).toBe(false);
    expect(events).toEqual([{ type: "unpublished", id: "d1" }]);
    unsub();
  });
});
