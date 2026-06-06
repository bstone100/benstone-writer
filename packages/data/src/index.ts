import { Repo, type DocHandle, type AnyDocumentId } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import * as A from "@automerge/automerge";
import { BrowserWSClientAdapter } from "./ws-client-adapter";
import { readable, type Readable } from "svelte/store";
import { parsePath, type Document, type Path } from "@bw/schema";
import { groupChanges, type HistoryEntry } from "./history";

/**
 * Cloud sync wiring (§8.1). A document syncs to its Durable Object only once
 * `enableSync(id)` is called for it — so the sharePolicy below announces ONLY
 * those docs to cloud peers, and nothing leaks. One WebSocket per open doc
 * (one DO per document). Dev points at the standalone sync Worker on :8787;
 * in production one Worker serves app + sync (wss://<host>/sync), wired at deploy.
 */
const SYNC_BASE = "ws://localhost:8787/sync";
const syncedDocs = new Set<string>();
const syncAdapters = new Map<string, BrowserWSClientAdapter>();

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
  const adapter = new BrowserWSClientAdapter(`${SYNC_BASE}/${documentId}`);
  syncAdapters.set(documentId, adapter);
  repo().networkSubsystem.addNetworkAdapter(adapter);
}

/* ------------------------------------------------------------------ *
 * Document registry — families & branches (§8). Each document is its own
 * Automerge doc; the FORK relationship (which family, forked from where,
 * at what point) lives here, relationally. The studio library lists family
 * roots; the BranchPicker lists one family's branches. Each branch is a
 * sibling timeline sharing ancestry up to its fork point (Patchwork).
 * (Local dev stand-in for D1; the registry itself syncs with multi-device.)
 * ------------------------------------------------------------------ */
interface RegistryEntry {
  id: string;
  /** The family's root document id; every branch of the family shares it. */
  familyId: string;
  /** The document this was forked from (absent for a family root). */
  parent?: string;
  /** Heads the fork was taken at (absent for a root). */
  forkedAtHeads?: string[];
  name: string;
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
  // A new document is the root ("main") of its own family (§8).
  addEntry({ id, familyId: id, name: "main", createdAt: now });
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

// The session-folding logic + HistoryEntry live in ./history (pure, unit-tested).
export type { HistoryEntry };

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

export interface Snapshot {
  title: string;
  paragraphs: string[];
}

function spansToParagraphs(spans: { type: string; value: unknown }[]): string[] {
  const paras: string[] = [];
  let cur = "";
  let open = false;
  for (const s of spans) {
    if (s.type === "block") {
      if (open) paras.push(cur);
      cur = "";
      open = true;
    } else if (s.type === "text") {
      cur += String(s.value);
    }
  }
  if (open) paras.push(cur);
  return paras;
}

/** documentAt(id, heads) — a read-only snapshot of the document at a past point. */
export function documentAt(id: string, heads: string[]): Promise<Snapshot> {
  return handleFor(id).then((h) => {
    const view = A.view(amDoc(h.doc()), heads) as unknown as Document & { body?: unknown };
    const spans =
      view.body !== undefined
        ? (A.spans(view as unknown as AmDoc, ["body"]) as { type: string; value: unknown }[])
        : [];
    return { title: view.title ?? "", paragraphs: spansToParagraphs(spans) };
  });
}

/**
 * branchFrom(id, heads) — fork a new branch document from a past point (§8). The
 * fork shares ancestry up to `heads` (Patchwork pattern); the original is
 * untouched (nothing is ever deleted). Registers the branch in the family so the
 * BranchPicker can list it. Returns the new document id.
 */
export function branchFrom(id: string, heads: string[]): Promise<string> {
  return handleFor(id).then((h) => {
    const forked = A.clone(A.view(amDoc(h.doc()), heads));
    const branch = repo().import<Document>(A.save(forked));
    const newId = branch.documentId as unknown as string;
    handles.set(newId, Promise.resolve(branch));
    const now = Date.now();
    void registryHandle().then((reg) =>
      reg.change((r) => {
        if (r.docs.some((d) => d.id === newId)) return;
        const familyId = r.docs.find((d) => d.id === id)?.familyId ?? id;
        r.docs.push({ id: newId, familyId, parent: id, forkedAtHeads: heads, name: "fork", createdAt: now });
      }),
    );
    return newId;
  });
}

/** branchHere(id) — fork a branch from the document's CURRENT state. */
export function branchHere(id: string): Promise<string> {
  return handleFor(id).then((h) => branchFrom(id, A.getHeads(amDoc(h.doc()))));
}

export interface BranchInfo {
  id: string;
  name: string;
  parent?: string;
  forkedAtHeads?: string[];
  createdAt: number;
  /** True for the branch currently being viewed. */
  current: boolean;
}

/** branches(id) — reactive list of the branches in this document's family (§8). */
export function branches(id: string): Readable<BranchInfo[]> {
  return readable<BranchInfo[]>([], (set) => {
    let handle: DocHandle<Registry> | undefined;
    let active = true;
    const onChange = () => {
      if (!handle) return;
      const docs = handle.doc().docs;
      const familyId = docs.find((d) => d.id === id)?.familyId ?? id;
      const fam: BranchInfo[] = docs
        .filter((d) => d.familyId === familyId)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((d) => ({
          id: d.id,
          name: d.name,
          parent: d.parent,
          forkedAtHeads: d.forkedAtHeads,
          createdAt: d.createdAt,
          current: d.id === id,
        }));
      // Always include the doc being viewed, even if it isn't registered.
      if (!fam.some((b) => b.id === id)) {
        fam.unshift({ id, name: "main", createdAt: 0, current: true });
      }
      set(fam);
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

export interface PublishSource {
  title: string;
  /** Automerge rich-text spans of the body, for static-HTML rendering (§4). */
  spans: { type: string; value: unknown; marks?: Record<string, unknown> }[];
}

/** bodyForPublish(id) — the current title + body spans, for the publish render. */
export function bodyForPublish(id: string): Promise<PublishSource> {
  return handleFor(id).then((h) => {
    const doc = h.doc() as Document & { body?: unknown };
    const spans =
      doc.body !== undefined
        ? (A.spans(amDoc(doc), ["body"]) as PublishSource["spans"])
        : [];
    return { title: doc.title ?? "", spans };
  });
}

/**
 * collection() — reactive list of family-ROOT document ids (§11.1). The library
 * lists roots only; branches live behind the BranchPicker. Each card reads its
 * own title by path.
 */
export function collection(): Readable<{ ids: string[] }> {
  return readable<{ ids: string[] }>({ ids: [] }, (set) => {
    let handle: DocHandle<Registry> | undefined;
    let active = true;
    const onChange = () => {
      if (handle) set({ ids: handle.doc().docs.filter((d) => !d.parent).map((d) => d.id) });
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
