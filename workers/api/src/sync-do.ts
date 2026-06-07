import "./shim"; // MUST precede Automerge (imported directly below + via automerge-repo).
import { DurableObject } from "cloudflare:workers";
import { Repo, type PeerId } from "@automerge/automerge-repo";
import * as A from "@automerge/automerge";
import { DONetworkAdapter } from "./do-network-adapter";
import { R2StorageAdapter } from "./r2-storage-adapter";
import { decode, isJoin } from "./wire";

export interface Env {
  SYNC_DOC: DurableObjectNamespace<SyncDocDO>;
  DOC_STORE: R2Bucket;
}

interface SocketState {
  joined?: boolean;
  peerId?: string;
  peerMetadata?: Record<string, unknown>;
}

/**
 * SyncDocDO — one Durable Object per document (§8.1). The authoritative
 * Automerge peer + hibernatable-WebSocket hub for a single document-family.
 *
 * The in-memory `Repo` (backed by R2) is a REBUILDABLE CACHE: the DO hibernates
 * between sync bursts, and on wake `boot()` reconstructs the Repo and re-attaches
 * the surviving sockets (from `ctx.getWebSockets()` + their serialized
 * attachments). No in-memory document state is ever assumed to survive — it's
 * reloaded from R2 on demand.
 *
 * Cloud-save signal (ROUND-2 R4): we do NOT force a flush per change (that stormed
 * the synchronizer). The Repo already auto-saves to R2 on a debounce; we simply
 * report the result. The storage subsystem emits the heads it's about to persist
 * (`doc-saved`/`doc-compacted`), and the R2 adapter calls us back AFTER the write
 * resolves — so the "saved" heads we broadcast to clients are provably durable and
 * an honest "safe to close the tab" signal.
 */
export class SyncDocDO extends DurableObject<Env> {
  private readonly net = new DONetworkAdapter();
  private repo?: Repo;
  private booted = false;
  /** Docs we've already asked the Repo to find() this lifetime. */
  private readonly known = new Set<string>();
  /** Heads the storage subsystem is persisting, per doc; promoted to a durable ack once R2 confirms. */
  private readonly pendingHeads = new Map<string, string[]>();
  /** The R2 storage adapter (also read directly to ack a doc's durable heads on connect). */
  private storage?: R2StorageAdapter;
  /** (peerId:docId) pairs already given an initial durable-heads ack this DO lifetime. */
  private readonly initialAcked = new Set<string>();

  private boot(): void {
    if (this.booted) return;

    // peerId for now derives from the DO instance; a doc-encoded peerId (for
    // precise multi-doc client sharePolicy) lands with multi-doc support.
    const serverPeerId = `server:${this.ctx.id.toString()}` as PeerId;
    this.storage = new R2StorageAdapter(this.env.DOC_STORE, (documentId, type) => {
      if (type === "incremental" || type === "snapshot") this.ackPersisted(documentId);
    });
    this.repo = new Repo({
      storage: this.storage,
      network: [this.net],
      peerId: serverPeerId,
      sharePolicy: async () => true, // server mirrors whatever a client syncs
    });
    this.repo.storageSubsystem?.on("doc-saved", (e) => {
      const ev = e as unknown as { documentId: string; savedHeads: string[] };
      this.pendingHeads.set(ev.documentId, ev.savedHeads);
    });
    this.repo.storageSubsystem?.on("doc-compacted", (e) => {
      const ev = e as unknown as { documentId: string; savedHeads: string[] };
      this.pendingHeads.set(ev.documentId, ev.savedHeads);
    });
    // NB: we deliberately do NOT call repo.find() from a storage event (e.g.
    // "document-loaded"). Doing so re-enters the Repo mid-sync and storms the
    // synchronizer (verified). The initial ack happens once in ensureDoc instead.

    // Re-announce every surviving socket as a peer so the fresh Repo can
    // proactively sync each connected client (not just whoever woke us).
    for (const ws of this.ctx.getWebSockets()) {
      const state = ws.deserializeAttachment() as SocketState | null;
      if (state?.joined && state.peerId) {
        this.net.announcePeer(state.peerId, ws, state.peerMetadata);
      }
    }

    this.booted = true;
  }

  /** A durable R2 write for `documentId` just completed → ack its now-safe heads (R4). */
  private ackPersisted(documentId: string): void {
    const heads = this.pendingHeads.get(documentId);
    if (heads) this.net.announceSaved(documentId, heads);
  }

  /** Ensure the in-DO Repo holds a handle for a doc a peer is syncing. */
  private ensureDoc(documentId: string): void {
    if (this.known.has(documentId)) return;
    this.known.add(documentId);
    // Instantiate the handle so the in-DO Repo syncs this doc + auto-persists it to
    // R2 (its normal debounced save). Ongoing "saved" acks flow from onPersist.
    void Promise.resolve(this.repo!.find(documentId as never)).catch(() => {
      this.known.delete(documentId);
    });
  }

  /**
   * Ack a doc's durable R2 heads — for the open-but-never-edited case (R4). Read the
   * heads STRAIGHT FROM R2, independent of the Repo handle (touching the handle
   * mid-sync storms the synchronizer — verified). R2 is the durable source, so this
   * is honest with NO race against client sync. A brand-new doc (no R2 chunks yet)
   * has no durable heads → no ack; it gets its first ack via onPersist.
   */
  private async ackInitialFromR2(documentId: string): Promise<void> {
    if (!this.storage) return;
    try {
      const snapshot = await this.storage.loadRange([documentId, "snapshot"]);
      const incremental = await this.storage.loadRange([documentId, "incremental"]);
      const parts = [...snapshot, ...incremental]
        .map((c) => c.data)
        .filter((d): d is Uint8Array => !!d);
      if (parts.length === 0) return; // brand-new doc, not durable yet
      const total = parts.reduce((n, p) => n + p.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const p of parts) {
        merged.set(p, offset);
        offset += p.length;
      }
      const doc = A.loadIncremental(A.init(), merged);
      this.net.announceSaved(documentId, A.getHeads(doc) as unknown as string[]);
    } catch {
      /* transient R2 read failure; the client stays "Saving…" until a persist acks */
    }
  }

  async fetch(request: Request): Promise<Response> {
    this.boot();
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket upgrade", { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    // Hibernatable accept: the DO can be evicted between messages and the socket
    // survives, re-delivered to webSocketMessage on wake.
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    this.boot();
    if (typeof message === "string") {
      ws.close(1003, "expected binary CBOR frame");
      return;
    }
    const msg = decode(message);
    const state = (ws.deserializeAttachment() as SocketState | null) ?? {};

    if (!state.joined) {
      if (!isJoin(msg)) return; // ignore anything before a valid join
      if (this.net.handleJoin(msg, ws)) {
        // Persist join-state (incl. peerMetadata) so it survives hibernation.
        ws.serializeAttachment({
          joined: true,
          peerId: msg.senderId,
          peerMetadata: (msg.peerMetadata ?? {}) as Record<string, unknown>,
        } satisfies SocketState);
      }
      return;
    }

    if (msg.type === "sync" && typeof msg.documentId === "string") {
      this.ensureDoc(msg.documentId);
      // The first time THIS client (peerId) syncs THIS doc, ack its durable R2 heads
      // (R4) — per-(peer,doc) so a reconnecting client re-acks even when the DO still
      // has the doc cached. Ongoing edits ack via onPersist.
      const ackKey = `${state.peerId}:${msg.documentId}`;
      if (state.peerId && !this.initialAcked.has(ackKey)) {
        this.initialAcked.add(ackKey);
        void this.ackInitialFromR2(msg.documentId);
      }
    }
    this.net.handleFrame(message, msg);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const state = ws.deserializeAttachment() as SocketState | null;
    if (state?.peerId) this.net.removePeer(state.peerId);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const state = ws.deserializeAttachment() as SocketState | null;
    if (state?.peerId) this.net.removePeer(state.peerId);
  }
}
