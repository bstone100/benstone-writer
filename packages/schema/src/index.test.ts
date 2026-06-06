import { describe, it, expect } from "vitest";
import { P, parsePath, DocumentSchema, PublishedPostSchema, PublishRequestSchema } from "./index";

describe("P — typed path builders (§11.1)", () => {
  it("builds document paths", () => {
    expect(P.document("abc").root).toEqual(["documents", "abc"]);
    expect(P.document("abc").title).toEqual(["documents", "abc", "title"]);
    expect(P.document("abc").body).toEqual(["documents", "abc", "body"]);
    expect(P.published("my-slug")).toEqual(["published", "my-slug"]);
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
  it("validates a published post and its publish request", () => {
    const post = { slug: "s", title: "t", html: "<p>x</p>", excerpt: "x", publishedAt: 1, sourceId: "d1" };
    expect(PublishedPostSchema.safeParse(post).success).toBe(true);
    // the request is the post minus the server-stamped time
    const { publishedAt: _omit, ...req } = post;
    expect(PublishRequestSchema.safeParse(req).success).toBe(true);
    expect(PublishRequestSchema.safeParse(post).success).toBe(true); // extra key tolerated
    expect(PublishRequestSchema.safeParse({ slug: "s" }).success).toBe(false); // missing fields
  });
});
