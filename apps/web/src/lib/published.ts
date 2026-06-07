import type { PublishedPost, PublishRequest } from "@bw/schema";

/**
 * The server-side index of published posts (§6 metadata), backed by Cloudflare
 * D1 and keyed by the source document's id — the UUID that IS the URL
 * (/documents/{id}); there are no slugs (ROUND-2 R2). Every function takes the
 * `DB` binding; when it's absent (plain `vite dev`, which can't emulate the
 * same-Worker bindings) the store degrades to empty — use `wrangler dev`
 * (miniflare D1) or deploy to exercise the real publish path.
 */
type Row = {
  id: string;
  title: string;
  html: string;
  excerpt: string;
  published_at: number;
};

const rowToPost = (r: Row): PublishedPost => ({
  id: r.id,
  title: r.title,
  html: r.html,
  excerpt: r.excerpt,
  publishedAt: r.published_at,
});

export async function upsertPost(
  db: D1Database | undefined,
  req: PublishRequest,
  publishedAt: number,
): Promise<PublishedPost> {
  if (db) {
    await db
      .prepare(
        "INSERT OR REPLACE INTO published_posts (id, title, html, excerpt, published_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(req.id, req.title, req.html, req.excerpt, publishedAt)
      .run();
  }
  return { ...req, publishedAt };
}

export async function getPost(
  db: D1Database | undefined,
  id: string,
): Promise<PublishedPost | undefined> {
  if (!db) return undefined;
  const row = await db.prepare("SELECT * FROM published_posts WHERE id = ?").bind(id).first<Row>();
  return row ? rowToPost(row) : undefined;
}

export async function listPosts(db: D1Database | undefined): Promise<PublishedPost[]> {
  if (!db) return [];
  const { results } = await db
    .prepare("SELECT * FROM published_posts ORDER BY published_at DESC")
    .all<Row>();
  return results.map(rowToPost);
}

export async function deletePost(db: D1Database | undefined, id: string): Promise<void> {
  if (db) await db.prepare("DELETE FROM published_posts WHERE id = ?").bind(id).run();
}
