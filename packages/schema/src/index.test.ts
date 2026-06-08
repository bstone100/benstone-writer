import { describe, it, expect } from "vitest";
import {
  P,
  parsePath,
  DocumentSchema,
  PublishedPostSchema,
  PublishRequestSchema,
  RpcContract,
  FeedEventSchema,
} from "./index";

describe("P — typed path builders (§11.1)", () => {
  it("builds document + published paths (the id IS the key; no slug — ROUND-2 R2)", () => {
    expect(P.document("abc").root).toEqual(["documents", "abc"]);
    expect(P.document("abc").title).toEqual(["documents", "abc", "title"]);
    expect(P.document("abc").body).toEqual(["documents", "abc", "body"]);
    expect(P.published("abc")).toEqual(["published", "abc"]);
  });
});

describe("parsePath — collection / id / field", () => {
  it("splits a root path", () => {
    expect(parsePath(["documents", "abc"])).toEqual({ collection: "documents", id: "abc", field: [] });
  });
  it("splits a field path", () => {
    expect(parsePath(["documents", "abc", "title"])).toEqual({
      collection: "documents",
      id: "abc",
      field: ["title"],
    });
  });
  it("round-trips with P", () => {
    const p = P.document("xyz").body;
    const { collection, id, field } = parsePath(p);
    expect([collection, id, ...field]).toEqual(p);
  });
  it("rejects an empty path", () => {
    expect(() => parsePath([])).toThrow();
  });
});

describe("schemas validate the data contract (§14)", () => {
  it("accepts a valid document and rejects a malformed one", () => {
    expect(DocumentSchema.safeParse({ title: "t", createdAt: 1, updatedAt: 2 }).success).toBe(true);
    expect(DocumentSchema.safeParse({ title: 123, createdAt: 1, updatedAt: 2 }).success).toBe(false);
  });
  it("validates a published post and its publish request (keyed by id, no slug)", () => {
    const post = { id: "d1", title: "t", html: "<p>x</p>", excerpt: "x", publishedAt: 1 };
    expect(PublishedPostSchema.safeParse(post).success).toBe(true);
    // the request is the post minus the server-stamped time
    const { publishedAt: _omit, ...req } = post;
    expect(PublishRequestSchema.safeParse(req).success).toBe(true);
    expect(PublishRequestSchema.safeParse(post).success).toBe(true); // extra key tolerated
    expect(PublishRequestSchema.safeParse({ id: "d1" }).success).toBe(false); // missing fields
  });
});

describe("RPC contract — define-once, zod-parsed at ingress (§14.1.B / R5)", () => {
  const makeLiveReq = { id: "d1", title: "t", html: "<p>x</p>", excerpt: "x", heads: ["h1"] };
  it("makeLive: validates input (needs heads) + output (id + version + publishedAt)", () => {
    expect(RpcContract.makeLive.input.safeParse(makeLiveReq).success).toBe(true);
    expect(RpcContract.makeLive.input.safeParse({ id: "d1", title: "t", html: "x", excerpt: "x" }).success).toBe(false); // no heads
    expect(RpcContract.makeLive.output.safeParse({ id: "d1", version: 1, publishedAt: 1 }).success).toBe(true);
    expect(RpcContract.makeLive.output.safeParse({ id: "d1", publishedAt: 1 }).success).toBe(false); // no version
  });
  it("nameVersion / versions / unpublish validate", () => {
    expect(RpcContract.nameVersion.input.safeParse({ id: "d1", heads: ["h1"], name: "v1" }).success).toBe(true);
    expect(RpcContract.versions.input.safeParse({ id: "d1" }).success).toBe(true);
    expect(
      RpcContract.versions.output.safeParse({ liveHeads: ["h1"], versions: [{ heads: ["h1"], version: 1, name: null, createdAt: 1 }] })
        .success,
    ).toBe(true);
    expect(RpcContract.versions.output.safeParse({ liveHeads: null, versions: [] }).success).toBe(true);
    expect(RpcContract.unpublish.input.safeParse({ id: "d1" }).success).toBe(true);
    expect(RpcContract.unpublish.output.safeParse({ ok: true }).success).toBe(true);
  });
});

describe("FeedEvent — discriminated union (§14.1.C)", () => {
  it("accepts both variants", () => {
    expect(FeedEventSchema.safeParse({ type: "published", id: "d1", updatedAt: 1 }).success).toBe(true);
    expect(FeedEventSchema.safeParse({ type: "unpublished", id: "d1" }).success).toBe(true);
  });
  it("rejects a published event missing updatedAt, and an unknown type", () => {
    expect(FeedEventSchema.safeParse({ type: "published", id: "d1" }).success).toBe(false);
    expect(FeedEventSchema.safeParse({ type: "edited", id: "d1" }).success).toBe(false);
  });
});
