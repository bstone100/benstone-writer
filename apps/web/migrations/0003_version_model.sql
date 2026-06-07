-- Round two (R5): the version model. "Make live" moves a LIVE pointer to a chosen
-- version and stamps a permanent monotonic vN; "Name version" labels one. The
-- public projection (published_posts) gains the live version's heads + its vN;
-- doc_versions logs every released/named version (the CRDT can't do a strict
-- counter, so the vN lives here, server-authoritative).
ALTER TABLE published_posts ADD COLUMN live_heads TEXT;
ALTER TABLE published_posts ADD COLUMN version INTEGER;

CREATE TABLE doc_versions (
  doc_id     TEXT NOT NULL,
  heads      TEXT NOT NULL,           -- JSON array — the version's identity
  version    INTEGER,                 -- monotonic vN, assigned on Make live; NULL if only named
  name       TEXT,                    -- optional human label
  created_at INTEGER NOT NULL,
  PRIMARY KEY (doc_id, heads)
);
