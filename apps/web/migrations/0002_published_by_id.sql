-- Round two (R2): published posts are keyed by the source document's id — the
-- UUID that IS the URL (/documents/{id}). Slugs are gone everywhere. No real
-- data exists yet (pre-launch), so drop + recreate rather than migrate rows.
DROP TABLE IF EXISTS published_posts;
CREATE TABLE published_posts (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  html         TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  published_at INTEGER NOT NULL
);
CREATE INDEX idx_published_at ON published_posts(published_at DESC);
