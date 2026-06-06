import { z } from "zod";

/**
 * A Path addresses exactly one entity (and optionally a field within it) in the
 * app's data "filesystem" (§11.1): e.g. ["documents", id] or
 * ["documents", id, "title"]. Paths are the ONLY way to name data.
 */
export type Path = readonly string[];

/**
 * The Automerge document for one writing piece. `body` holds the editor's
 * ProseMirror content (populated by @automerge/prosemirror in the editor phase).
 */
export const DocumentSchema = z.object({
  title: z.string(),
  body: z.unknown().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Document = z.infer<typeof DocumentSchema>;

/**
 * A published post (§4, §6 metadata). Created at publish time by rendering a
 * document's Automerge body to **static HTML** (DOMSerializer over the editor's
 * schema), so the public reader ships zero editor/CRDT JS. This is the wire
 * contract for both the publish RPC and the reader's SSR load (define-once §14).
 */
export const PublishedPostSchema = z.object({
  slug: z.string(),
  title: z.string(),
  /** Pre-rendered body HTML (sanitized at render time from our own schema). */
  html: z.string(),
  /** Plain-text lead for the index + meta tags. */
  excerpt: z.string(),
  publishedAt: z.number(),
  /** The `documents/{id}` this was published from (for the inline-edit affordance). */
  sourceId: z.string(),
});
export type PublishedPost = z.infer<typeof PublishedPostSchema>;

/** The publish RPC input: the rendered post minus the server-stamped time. */
export const PublishRequestSchema = PublishedPostSchema.omit({ publishedAt: true });
export type PublishRequest = z.infer<typeof PublishRequestSchema>;

/**
 * Reader-feed event (§7 #5) — pushed over SSE to open readers when a post is
 * published/updated, so the page updates in place (never a reload/poll). The
 * one wire shape the feed server emits and the reader client parses.
 */
export interface FeedEvent {
  type: "published";
  slug: string;
}

/** Typed path builders — the only sanctioned way to construct a Path. */
export const P = {
  documents: ["documents"] as Path,
  document(id: string) {
    return {
      root: ["documents", id] as Path,
      title: ["documents", id, "title"] as Path,
      body: ["documents", id, "body"] as Path,
    };
  },
  published(slug: string): Path {
    return ["published", slug];
  },
} as const;

/** Split a Path into its collection, entity id, and remaining field segments. */
export function parsePath(path: Path): {
  collection: string;
  id: string | undefined;
  field: string[];
} {
  const [collection, id, ...field] = path;
  if (!collection) throw new Error("empty path");
  return { collection, id, field };
}
