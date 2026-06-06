import "./shim"; // MUST precede the automerge import below.
import { DurableObject } from "cloudflare:workers";
import { Repo, type PeerId } from "@automerge/automerge-repo";
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
 */
export class SyncDocDO extends DurableObject<Env> {
  private readonly net = new DONetworkAdapter();
  private repo?: Repo;
  private booted = false;
  /** Docs we've already asked the Repo to find() this lifetime. */
  private readonly known = new Set<string>();

  private boot(): void {
    if (this.booted) return;

    // peerId for now derives from the DO instance; a doc-encoded peerId (for
    // precise multi-doc client sharePolicy) lands with multi-doc support.
    const serverPeerId = `server:${this.ctx.id.toString()}` as PeerId;
    this.repo = new Repo({
      storage: new R2StorageAdapter(this.env.DOC_STORE),
      network: [this.net],
      peerId: serverPeerId,
      sharePolicy: async () => true, // server mirrors whatever a client syncs
    });

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

  /** Ensure the in-DO Repo holds a handle for a doc a peer is syncing. */
  private ensureDoc(documentId: string): void {
    if (this.known.has(documentId)) return;
    this.known.add(documentId);
    // Side-effecting: instantiates the handle (loads from R2 if present), so the
    // synchronizer can process the incoming sync frame. Repo.find may reject for
    // a genuinely-unknown doc; the peer's own changes will still populate it.
    void Promise.resolve(this.repo!.find(documentId as never)).catch(() => {
      this.known.delete(documentId);
    });
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
