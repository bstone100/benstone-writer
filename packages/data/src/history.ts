/**
 * Pure history helpers (§8) — folding the fine-grained Automerge change DAG into
 * coarse edit-sessions for the timeline. Kept free of Automerge imports so it's
 * unit-testable without the WASM; `index.ts` feeds it decoded changes.
 */
import type { VersionMeta } from "@bw/schema";

export interface HistoryEntry {
  /** Heads to view the document at this session's end. */
  heads: string[];
  /** Unix ms of the session's last change. */
  time: number;
  /** Fine-grained changes folded into this session. */
  changeCount: number;
}

/** Automerge stores change time in seconds; tolerate ms too. */
export const toMs = (t: number): number => (t > 1e12 ? t : t * 1000);

/** A new edit-session after this much idle time. */
export const SESSION_GAP_MS = 3 * 60 * 1000;

/** Fold time-ordered changes into edit-sessions (oldest → newest). */
export function groupChanges(changes: { hash: string; time: number }[]): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  let cur: HistoryEntry | null = null;
  for (const c of changes) {
    const time = toMs(c.time);
    if (cur && time - cur.time <= SESSION_GAP_MS) {
      cur.heads = [c.hash];
      cur.time = time;
      cur.changeCount += 1;
    } else {
      if (cur) out.push(cur);
      cur = { heads: [c.hash], time, changeCount: 1 };
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** One row in the History panel: a point you can preview, make live, or restore to. */
export interface TimelineRow {
  /** Heads to view the document at this point. */
  heads: string[];
  /** Unix ms — the edit-session's last change, or the version's release time. */
  time: number;
  /** Fine-grained edits folded here; null for a released/named version with no matching local session. */
  changeCount: number | null;
  /** Permanent monotonic vN (from the server), or null. */
  version: number | null;
  /** Optional human label (from the server), or null. */
  name: string | null;
  /** This is the version the public currently sees (the crown). */
  live: boolean;
  /** This is the current draft — the newest local edit-session (restoring it to itself is a no-op). */
  current: boolean;
}

/** Order-independent identity of a heads set (a version is a SET of heads). */
const headsKey = (heads: string[]): string => [...heads].sort().join("\n");

/**
 * Merge the local edit-session timeline with the server's version metadata into the
 * rows the History panel renders (§8, ROUND-2 R5). A released / named / live version
 * is a FIRST-CLASS row sourced from the server — so it appears even when its heads no
 * longer coincide with a local edit-session tip. (The bug this fixes: you Make-live at
 * head H, then keep typing; `groupChanges` folds H into a session's interior, so H is
 * no longer any session's tip — and the old code, which rendered ONLY session tips,
 * dropped the live version entirely, crown and all. Sourcing version rows from the
 * server makes them unconditional, and also handles multi-head frontiers a single
 * session tip can't express.) Deduped by heads (a session that still coincides with a
 * version carries the version's vN/name/live), newest first.
 */
export function mergeTimeline(
  sessions: HistoryEntry[], // oldest → newest (from groupChanges)
  versions: VersionMeta[],
  liveHeads: string[] | null,
): TimelineRow[] {
  const liveKey = liveHeads ? headsKey(liveHeads) : null;
  const versionByKey = new Map(versions.map((v) => [headsKey(v.heads), v] as const));
  const currentKey = sessions.length ? headsKey(sessions[sessions.length - 1].heads) : null;

  const rows = new Map<string, TimelineRow>();
  for (const s of sessions) {
    const key = headsKey(s.heads);
    const v = versionByKey.get(key);
    rows.set(key, {
      heads: s.heads,
      time: s.time,
      changeCount: s.changeCount,
      version: v?.version ?? null,
      name: v?.name ?? null,
      live: key === liveKey,
      current: key === currentKey,
    });
  }
  for (const v of versions) {
    const key = headsKey(v.heads);
    if (rows.has(key)) continue; // already represented by a local session
    rows.set(key, {
      heads: v.heads,
      time: v.createdAt,
      changeCount: null,
      version: v.version,
      name: v.name,
      live: key === liveKey,
      current: false,
    });
  }
  return [...rows.values()].sort((a, b) => b.time - a.time);
}
