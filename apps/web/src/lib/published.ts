import type { PublishedPost, MakeLiveRequest, VersionMeta } from "@bw/schema";

/**
 * The server-side publish + version store (§6, ROUND-2 R5), backed by Cloudflare
 * D1 and keyed by the document id (the UUID that IS the URL). `published_posts` is
 * the LIVE projection (one row per doc — what visitors read); `doc_versions` is the
 * per-doc log of released (vN) + named versions for the history ⋮ menu. Every
 * function takes the `DB` binding; absent (plain `vite dev`) it degrades to empty
 * / a no-op — use `wrangler dev` or deploy to exercise the real path.
 */
type Row = { id: string; title: string; html: string; excerpt: string; published_at: number };

const rowToPost = (r: Row): PublishedPost => ({
  id: r.id,
  title: r.title,
  html: r.html,
  excerpt: r.excerpt,
  publishedAt: r.published_at,
});

/** The LIVE projection a visitor reads. */
export async function getPost(
  db: D1Database | undefined,
  id: string,
): Promise<PublishedPost | undefined> {
  if (!db) return undefined;
  const row = await db.prepare("SELECT * FROM published_posts WHERE id = ?").bind(id).first<Row>();
  return row ? rowToPost(row) : undefined;
}

/** All live posts, newest first — for the index. */
export async function listPosts(db: D1Database | undefined): Promise<PublishedPost[]> {
  if (!db) return [];
  const { results } = await db
    .prepare("SELECT * FROM published_posts ORDER BY published_at DESC")
    .all<Row>();
  return results.map(rowToPost);
}

/** Take the doc down: remove its live projection (the version log persists). */
export async function deletePost(db: D1Database | undefined, id: string): Promise<void> {
  if (db) await db.prepare("DELETE FROM published_posts WHERE id = ?").bind(id).run();
}

/**
 * Make a version LIVE (R5): assign (or reuse) its permanent monotonic vN, log the
 * version, and store its rendered projection as the live one. Returns the vN.
 */
export async function makeLivePost(
  db: D1Database | undefined,
  req: MakeLiveRequest,
  publishedAt: number,
): Promise<{ id: string; version: number; publishedAt: number }> {
  if (!db) return { id: req.id, version: 1, publishedAt }; // dev fallback (no D1)
  const headsJson = JSON.stringify(req.heads);
  // Reuse this version's vN if it already has one; else take the doc's next vN.
  const existing = await db
    .prepare("SELECT version FROM doc_versions WHERE doc_id = ? AND heads = ?")
    .bind(req.id, headsJson)
    .first<{ version: number | null }>();
  const max = await db
    .prepare("SELECT MAX(version) AS m FROM doc_versions WHERE doc_id = ?")
    .bind(req.id)
    .first<{ m: number | null }>();
  const version = existing?.version ?? (max?.m ?? 0) + 1;
  // Record/assign the version (keep any existing vN + name).
  await db
    .prepare(
      "INSERT INTO doc_versions (doc_id, heads, version, name, created_at) VALUES (?, ?, ?, NULL, ?) " +
        "ON CONFLICT(doc_id, heads) DO UPDATE SET version = COALESCE(doc_versions.version, excluded.version)",
    )
    .bind(req.id, headsJson, version, publishedAt)
    .run();
  // Store the live projection + move the LIVE pointer.
  await db
    .prepare(
      "INSERT OR REPLACE INTO published_posts (id, title, html, excerpt, published_at, live_heads, version) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(req.id, req.title, req.html, req.excerpt, publishedAt, headsJson, version)
    .run();
  return { id: req.id, version, publishedAt };
}

/** Attach (or replace) a human name on a version (R5). */
export async function nameVersion(
  db: D1Database | undefined,
  id: string,
  heads: string[],
  name: string,
  createdAt: number,
): Promise<void> {
  if (!db) return;
  await db
    .prepare(
      "INSERT INTO doc_versions (doc_id, heads, version, name, created_at) VALUES (?, ?, NULL, ?, ?) " +
        "ON CONFLICT(doc_id, heads) DO UPDATE SET name = excluded.name",
    )
    .bind(id, JSON.stringify(heads), name, createdAt)
    .run();
}

/** The doc's version metadata (the live pointer + released/named versions) for the history panel (R5). */
export async function getVersions(
  db: D1Database | undefined,
  id: string,
): Promise<{ liveHeads: string[] | null; versions: VersionMeta[] }> {
  if (!db) return { liveHeads: null, versions: [] };
  const live = await db
    .prepare("SELECT live_heads FROM published_posts WHERE id = ?")
    .bind(id)
    .first<{ live_heads: string | null }>();
  const liveHeads = live?.live_heads ? (JSON.parse(live.live_heads) as string[]) : null;
  const { results } = await db
    .prepare("SELECT heads, version, name, created_at FROM doc_versions WHERE doc_id = ? ORDER BY created_at DESC")
    .bind(id)
    .all<{ heads: string; version: number | null; name: string | null; created_at: number }>();
  const versions: VersionMeta[] = results.map((r) => ({
    heads: JSON.parse(r.heads) as string[],
    version: r.version,
    name: r.name,
    createdAt: r.created_at,
  }));
  return { liveHeads, versions };
}
