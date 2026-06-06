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
 * Reader-feed events (§7 #5, §14.1.C) — pushed over SSE to open readers so the
 * page updates in place (never a reload/poll). Defined once; the feed server
 * emits these and the reader client parses them. A discriminated union: a
 * (re)publish carries `updatedAt`; an unpublish just the slug.
 */
export const FeedEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("published"), slug: z.string(), updatedAt: z.number() }),
  z.object({ type: z.literal("unpublished"), slug: z.string() }),
]);
export type FeedEvent = z.infer<typeof FeedEventSchema>;

/**
 * The RPC surface (§14.1.B) — define-once, both sides derive. Browser → Worker
 * imperative verbs ONLY; content edits are NOT here (those are local mutate() →
 * Automerge → synced). Each verb names an input + output Zod schema; the server
 * zod-parses input on ingress and the typed client (apps/web/src/lib/rpc.ts)
 * infers both ends from this one object. The surface is deliberately tiny —
 * local-first means almost nothing needs the server — so a thin typed contract
 * is the right tool; a full RPC framework (oRPC) is the drop-in only if the
 * surface ever grows or a non-TS client appears (§14, §17.7).
 */
export const RpcContract = {
  /** Store a client-rendered post + notify the reader-feed. */
  publish: {
    input: PublishRequestSchema,
    output: z.object({ slug: z.string(), publishedAt: z.number() }),
  },
  /** Remove a published post + notify the reader-feed. */
  unpublish: {
    input: z.object({ slug: z.string() }),
    output: z.object({ ok: z.literal(true) }),
  },
} as const;
export type RpcVerb = keyof typeof RpcContract;
export type RpcInput<V extends RpcVerb> = z.infer<(typeof RpcContract)[V]["input"]>;
export type RpcOutput<V extends RpcVerb> = z.infer<(typeof RpcContract)[V]["output"]>;

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
