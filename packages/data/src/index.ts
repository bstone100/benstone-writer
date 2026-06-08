import { Repo, type DocHandle, type AnyDocumentId } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import * as A from "@automerge/automerge";
import { BrowserWSClientAdapter } from "./ws-client-adapter";
import { readable, type Readable } from "svelte/store";
import { parsePath, type Document, type Path } from "@bw/schema";
import { groupChanges, mergeTimeline, type HistoryEntry, type TimelineRow } from "./history";

/**
 * Cloud sync wiring (§8.1). A document syncs to its Durable Object only once
 * `enableSync(id)` is called for it — so the sharePolicy below announces ONLY
 * those docs to cloud peers, and nothing leaks. One WebSocket per open doc
 * (one DO per document). The endpoint is SAME-ORIGIN — `/sync/{id}` on this
 * host — so one Worker serves app + sync and the Access cookie rides the
 * upgrade (§13, §15). Resolved per-call (browser-only; enableSync runs onMount).
 */
function syncUrl(documentId: string): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/sync/${documentId}`;
}
const syncedDocs = new Set<string>();
const syncAdapters = new Map<string, BrowserWSClientAdapter>();

/* ---- Cloud-save status (ROUND-2 R4): is the work DURABLY in the cloud yet? ----
 * "saved" means the DO has acked an R2-persist whose heads match what's on screen
 * — i.e. it is genuinely safe to lose this device. We err toward "saving" and
 * never show "saved" before the durable heads match (honesty over optimism). */
export type SaveState = "offline" | "saving" | "saved";
const cloudHeads = new Map<string, string[]>(); // durable heads acked by the DO (post-R2)
const localHeadsByDoc = new Map<string, string[]>(); // the doc's current local heads
const connectedByDoc = new Map<string, boolean>(); // is the sync socket up?
const statusSubs = new Map<string, Set<(s: SaveState) => void>>();

function sameHeads(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((h) => set.has(h));
}
function computeStatus(id: string): SaveState {
  if (connectedByDoc.get(id) === false) return "offline";
  return sameHeads(localHeadsByDoc.get(id), cloudHeads.get(id)) ? "saved" : "saving";
}
function emitStatus(id: string): void {
  const subs = statusSubs.get(id);
  if (!subs) return;
  const s = computeStatus(id);
  for (const fn of subs) fn(s);
}

/** saveStatus(id) — reactive cloud-durability status for a document (R4). */
export function saveStatus(documentId: string): Readable<SaveState> {
  return readable<SaveState>(computeStatus(documentId), (set) => {
    let subs = statusSubs.get(documentId);
    if (!subs) {
      subs = new Set();
      statusSubs.set(documentId, subs);
    }
    subs.add(set);
    set(computeStatus(documentId));
    return () => subs!.delete(set);
  });
}

/**
 * The single browser-local Automerge repo — the local-first source of truth
 * (§6, Tier 0). Lazily created so this module is SSR-safe (IndexedDB only
 * exists in the browser). The network adapter (cloud sync) is added in #5.
 */
let _repo: Repo | undefined;
function repo(): Repo {
  if (!_repo) {
    _repo = new Repo({
      storage: new IndexedDBStorageAdapter("benstone-writer"),
      // Announce a doc to cloud peers only after it's been opened for sync.
      sharePolicy: async (_peerId, documentId) =>
        documentId != null && syncedDocs.has(documentId as string),
    });
  }
  return _repo;
}

/**
 * enableSync(documentId) — connect this document to its cloud Durable Object so
 * local changes sync to R2 + across devices (§8.1). Idempotent; opens one
 * WebSocket to the doc's DO. Writes never await it — sync is background (§11.4).
 */
export function enableSync(documentId: string): void {
  if (syncedDocs.has(documentId)) return;
  syncedDocs.add(documentId);
  const adapter = new BrowserWSClientAdapter(syncUrl(documentId), {
    onSaved: (docId, heads) => {
      cloudHeads.set(docId, heads);
      emitStatus(docId);
    },
    onConnection: (isUp) => {
      connectedByDoc.set(documentId, isUp);
      emitStatus(documentId);
    },
  });
  syncAdapters.set(documentId, adapter);
  repo().networkSubsystem.addNetworkAdapter(adapter);

  // Track LOCAL heads so we can tell when the cloud's durable heads have caught up.
  void handleFor(documentId).then((h) => {
    const update = () => {
      localHeadsByDoc.set(documentId, A.getHeads(h.doc() as never));
      emitStatus(documentId);
    };
    h.on("change", update);
    update();
  });
}

/* ------------------------------------------------------------------ *
 * Document registry (§8) — the index of which documents exist, so the owner's
 * index can list them. Each piece is its own Automerge doc; this just names
 * them. ROUND-2 collapsed the UX to ONE linear history per document (HEAD/LIVE
 * pointers, §3.3), so round one's fork/family vocabulary is gone — there are no
 * branches to relate. (Local dev stand-in for D1; the registry syncs across
 * devices.)
 * ------------------------------------------------------------------ */
interface RegistryEntry {
  id: string;
  createdAt: number;
}
interface Registry {
  docs: RegistryEntry[];
}
const REGISTRY_KEY = "bw-registry-v2";
let _registry: Promise<DocHandle<Registry>> | undefined;
function registryHandle(): Promise<DocHandle<Registry>> {
  if (!_registry) {
    const existing = localStorage.getItem(REGISTRY_KEY);
    if (existing) {
      _registry = repo().find<Registry>(existing as AnyDocumentId);
    } else {
      const h = repo().create<Registry>({ docs: [] });
      localStorage.setItem(REGISTRY_KEY, h.documentId as unknown as string);
      _registry = Promise.resolve(h);
    }
  }
  return _registry;
}
function addEntry(entry: RegistryEntry): void {
  void registryHandle().then((reg) =>
    reg.change((r) => {
      if (!r.docs.some((d) => d.id === entry.id)) r.docs.push(entry);
    }),
  );
}

/** Cache handles (by id) so reads/writes after the first find are instant. */
const handles = new Map<string, Promise<DocHandle<Document>>>();
function handleFor(id: string): Promise<DocHandle<Document>> {
  let h = handles.get(id);
  if (!h) {
    h = repo().find<Document>(id as AnyDocumentId);
    handles.set(id, h);
  }
  return h;
}

function valueAt(doc: unknown, field: string[]): unknown {
  let v: unknown = doc;
  for (const seg of field) v = v == null ? undefined : (v as Record<string, unknown>)[seg];
  return v;
}

/**
 * read(path) — the reactive accessor for the value at a path (§11.1). Returns a
 * Svelte store; reading it in a component subscribes to *just* this path and
 * auto-unsubscribes on unmount. Fine-grained: one store per path.
 */
export function read<T = unknown>(path: Path): Readable<T | undefined> {
  const { collection, id, field } = parsePath(path);
  if (collection !== "documents" || !id) {
    return readable<T | undefined>(undefined); // published/ + settings/ land later
  }
  return readable<T | undefined>(undefined, (set) => {
    let handle: DocHandle<Document> | undefined;
    let active = true;
    const onChange = () => {
      if (!handle) return;
      const doc = handle.doc();
      set((field.length ? valueAt(doc, field) : doc) as T | undefined);
    };
    void handleFor(id).then((h) => {
      if (!active) return;
      handle = h;
      h.on("change", onChange);
      onChange();
    });
    return () => {
      active = false;
      handle?.off("change", onChange);
    };
  });
}

/**
 * mutate(docPath, recipe) — the only write. Applies to the local Automerge doc;
 * instant, never awaits the network (§11.4). Sync to the cloud happens in #5.
 */
export function mutate(docPath: Path, recipe: (doc: Document) => void): void {
  const { collection, id } = parsePath(docPath);
  if (collection !== "documents" || !id) {
    throw new Error(`mutate: unsupported path ${docPath.join("/")}`);
  }
  void handleFor(id).then((h) => h.change(recipe));
}

/**
 * createDocument(initial) — create a new local-first document; returns its id,
 * which is the entity id in its path (documents/{id}).
 */
export function createDocument(initial?: Partial<Document>): string {
  const now = Date.now();
  // Every document is a writing document: it has a `body` rich-text field from
  // birth. Seeding `body: ""` materializes the Automerge text object at
  // `_root/body` so the editor binding (`A.spans(doc, ["body"])`, §11.5) reads
  // an empty span list instead of throwing on a nonexistent object. An empty
  // text renders as one implicit empty paragraph — a valid ProseMirror doc.
  const initialDoc: Document = {
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const h = repo().create<Document>(initialDoc);
  const id = h.documentId as unknown as string;
  handles.set(id, Promise.resolve(h));
  addEntry({ id, createdAt: now });
  return id;
}

/**
 * getHandle(id) — low-level access to the DocHandle. Used ONLY by the editor
 * binding, which is inherently handle-based (@automerge/prosemirror). Normal
 * components never touch this; they use read/mutate.
 */
export function getHandle(id: string): Promise<DocHandle<Document>> {
  return handleFor(id);
}

/* ------------------------------------------------------------------ *
 * Versioning & branching (§8) — the Automerge change DAG IS the history.
 * These derive READ-ONLY views and forks from it; nothing is ever mutated
 * or deleted, so abandoned drafts are preserved for free.
 * ------------------------------------------------------------------ */

type AmDoc = A.Doc<Document>;
const amDoc = (d: Document): AmDoc => d as unknown as AmDoc;

// The session-folding logic + timeline merge live in ./history (pure, unit-tested).
export type { HistoryEntry, TimelineRow };
export { mergeTimeline };

/** Fold the fine-grained change DAG into coarse edit-sessions (§8). */
function sessionsOf(doc: Document): HistoryEntry[] {
  return groupChanges(A.getAllChanges(amDoc(doc)).map((raw) => A.decodeChange(raw)));
}

/** history(id) — reactive edit-session timeline (oldest → newest). */
export function history(id: string): Readable<HistoryEntry[]> {
  return readable<HistoryEntry[]>([], (set) => {
    let handle: DocHandle<Document> | undefined;
    let active = true;
    const recompute = () => {
      if (handle) set(sessionsOf(handle.doc()));
    };
    void handleFor(id).then((h) => {
      if (!active) return;
      handle = h;
      h.on("change", recompute);
      recompute();
    });
    return () => {
      active = false;
      handle?.off("change", recompute);
    };
  });
}

export interface PublishSource {
  title: string;
  /** Automerge rich-text spans of the body, for static-HTML rendering (§4). */
  spans: { type: string; value: unknown; marks?: Record<string, unknown> }[];
}

/** bodyForPublish(id, heads?) — title + body spans (at `heads`, or current HEAD) for the publish render. */
export function bodyForPublish(id: string, heads?: string[]): Promise<PublishSource> {
  return handleFor(id).then((h) => {
    const base = amDoc(h.doc());
    const doc = (heads ? A.view(base, heads) : base) as unknown as Document & { body?: unknown };
    const spans =
      doc.body !== undefined
        ? (A.spans(doc as unknown as AmDoc, ["body"]) as PublishSource["spans"])
        : [];
    return { title: doc.title ?? "", spans };
  });
}

/**
 * restoreToHead(id, heads) — roll a past version's content forward to HEAD as ONE
 * linear change (ROUND-2 §3.3; verified in _probe-versions.mjs). NOT a fork: a
 * forward `change()` that rewrites title + body to match `view(doc, heads)` (using
 * `updateSpans` so rich-text marks restore too), so nothing in history is lost and
 * the editing draft becomes that version. The editor, bound to the doc, follows.
 */
export function restoreToHead(id: string, heads: string[]): Promise<void> {
  return handleFor(id).then((h) => {
    const view = A.view(amDoc(h.doc()), heads) as unknown as Document & { body?: unknown };
    const title = view.title ?? "";
    const viewSpans = view.body !== undefined ? A.spans(view as unknown as AmDoc, ["body"]) : [];
    h.change((d) => {
      (d as { title: string }).title = title;
      A.updateSpans(d as unknown as AmDoc, ["body"], viewSpans);
    });
  });
}

/** headsOf(id) — the document's current heads (the version "Make live" publishes). */
export function headsOf(id: string): Promise<string[]> {
  return handleFor(id).then((h) => A.getHeads(amDoc(h.doc())) as string[]);
}

/**
 * collection() — reactive list of all document ids (§11.1). The owner index
 * lists them; each card reads its own title by path.
 */
export function collection(): Readable<{ ids: string[] }> {
  return readable<{ ids: string[] }>({ ids: [] }, (set) => {
    let handle: DocHandle<Registry> | undefined;
    let active = true;
    const onChange = () => {
      if (handle) set({ ids: handle.doc().docs.map((d) => d.id) });
    };
    void registryHandle().then((h) => {
      if (!active) return;
      handle = h;
      h.on("change", onChange);
      onChange();
    });
    return () => {
      active = false;
      handle?.off("change", onChange);
    };
  });
}
