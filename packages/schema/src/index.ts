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
  /** The source document's id (documents/{id}) — this IS the key and the URL; no slug exists anywhere (ROUND-2 R2). */
  id: z.string(),
  title: z.string(),
  /** Pre-rendered body HTML (sanitized at render time from our own schema). */
  html: z.string(),
  /** Plain-text lead for the index + meta tags. */
  excerpt: z.string(),
  publishedAt: z.number(),
});
export type PublishedPost = z.infer<typeof PublishedPostSchema>;

/** The publish RPC input: the rendered post minus the server-stamped time. */
export const PublishRequestSchema = PublishedPostSchema.omit({ publishedAt: true });
export type PublishRequest = z.infer<typeof PublishRequestSchema>;

/** Make-live RPC input: a version's rendered projection + the heads being made live (R5). */
export const MakeLiveRequestSchema = PublishRequestSchema.extend({ heads: z.array(z.string()) });
export type MakeLiveRequest = z.infer<typeof MakeLiveRequestSchema>;

/** A released/named version of a document, for the history ⋮ menu (R5). */
export const VersionMetaSchema = z.object({
  heads: z.array(z.string()),
  /** Permanent monotonic release number (vN), assigned on Make live; null if only named. */
  version: z.number().nullable(),
  /** Optional human label (the "Name version" action). */
  name: z.string().nullable(),
  /** When this version was released/named (doc_versions.created_at) — orders it in the timeline even when its heads no longer match a local edit-session. */
  createdAt: z.number(),
});
export type VersionMeta = z.infer<typeof VersionMetaSchema>;

/**
 * Reader-feed events (§7 #5, §14.1.C) — pushed over SSE to open readers so the
 * page updates in place (never a reload/poll). Defined once; the feed server
 * emits these and the reader client parses them. A discriminated union: a
 * (re)publish carries `updatedAt`; an unpublish just the id.
 */
export const FeedEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("published"), id: z.string(), updatedAt: z.number() }),
  z.object({ type: z.literal("unpublished"), id: z.string() }),
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
  /** Make a version LIVE: store its rendered projection, assign the next vN, notify the feed (R5). */
  makeLive: {
    input: MakeLiveRequestSchema,
    output: z.object({ id: z.string(), version: z.number(), publishedAt: z.number() }),
  },
  /** Attach a human name to a version (R5). */
  nameVersion: {
    input: z.object({ id: z.string(), heads: z.array(z.string()), name: z.string() }),
    output: z.object({ ok: z.literal(true) }),
  },
  /** The doc's version metadata (the live pointer + released/named versions) for the history panel (R5). */
  versions: {
    input: z.object({ id: z.string() }),
    output: z.object({
      liveHeads: z.array(z.string()).nullable(),
      versions: z.array(VersionMetaSchema),
    }),
  },
  /** Take the doc down (remove its live projection) + notify the reader-feed. */
  unpublish: {
    input: z.object({ id: z.string() }),
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
  published(id: string): Path {
    return ["published", id];
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
