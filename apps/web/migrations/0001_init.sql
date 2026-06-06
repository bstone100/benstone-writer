-- Published-post index (§6 metadata). The reader plane (SSR) reads from here;
-- the publish/unpublish RPC writes here. The post BODY is pre-rendered static
-- HTML stored inline (small; one row per published essay). Document/branch
-- registries stay local-first (IndexedDB) for now — only published projections
-- need the server.
CREATE TABLE IF NOT EXISTS published_posts (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  html         TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  source_id    TEXT NOT NULL,
  published_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_published_at ON published_posts(published_at DESC);
