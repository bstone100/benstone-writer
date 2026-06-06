import { Repo, type DocHandle, type AnyDocumentId } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { readable, type Readable } from "svelte/store";
import { parsePath, type Document, type Path } from "@bw/schema";

/**
 * The single browser-local Automerge repo — the local-first source of truth
 * (§6, Tier 0). Lazily created so this module is SSR-safe (IndexedDB only
 * exists in the browser). The network adapter (cloud sync) is added in #5.
 */
let _repo: Repo | undefined;
function repo(): Repo {
  if (!_repo) {
    _repo = new Repo({ storage: new IndexedDBStorageAdapter("benstone-writer") });
  }
  return _repo;
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

/**
 * collection(query) — reactive list of entity ids. Local listing needs a
 * registry document (built with the library UI, #4/#7). Stub for now.
 */
export function collection(): Readable<{ ids: string[] }> {
  return readable({ ids: [] });
}
