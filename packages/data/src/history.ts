/**
 * Pure history helpers (§8) — folding the fine-grained Automerge change DAG into
 * coarse edit-sessions for the timeline. Kept free of Automerge imports so it's
 * unit-testable without the WASM; `index.ts` feeds it decoded changes.
 */
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
