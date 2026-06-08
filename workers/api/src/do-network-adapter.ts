import {
  NetworkAdapter,
  type Message,
  type PeerId,
  type PeerMetadata,
} from "@automerge/automerge-repo";
import { encode, PROTOCOL_V1, type WireMessage } from "./wire";

/**
 * DONetworkAdapter — automerge-repo's NetworkAdapter, implemented inside the
 * Durable Object (§8.1). Ports mergeparty's `Relay` protocol logic onto raw DO
 * WebSockets. It deliberately does NOT own the socket lifecycle — the DO does,
 * via the hibernation API — so this holds only an in-memory peerId→socket map
 * that the DO rebuilds from `ctx.getWebSockets()` after a hibernation wake.
 *
 * Handshake (mirrors the stock WebSocketServerAdapter, verified from source):
 *   client → { join, senderId, supportedProtocolVersions:["1"] }
 *   server → { peer, senderId:server, selectedProtocolVersion:"1", targetId }
 * Post-join, frames are relayed by `targetId`; frames addressed to the server
 * are surfaced to the in-DO Repo via `emit("message")`.
 */
export class DONetworkAdapter extends NetworkAdapter {
  readonly sockets = new Map<string, WebSocket>();

  isReady(): boolean {
    return true;
  }

  whenReady(): Promise<void> {
    return Promise.resolve();
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata;
  }

  disconnect(): void {
    // Sockets are owned by the DO; nothing to tear down here.
  }

  send(message: Message): void {
    const data = (message as { data?: Uint8Array }).data;
    if (data && data.byteLength === 0) {
      throw new Error("Tried to send a zero-length message");
    }
    const ws = this.sockets.get(message.targetId as string);
    // TEMP(v0.1.1 diag): is the in-DO Repo's response reaching a live socket?
    console.log("[do] send", (message as { type?: string }).type, "→",
      String(message.targetId).slice(0, 14), "hasWs=", !!ws, "of", this.sockets.size);
    if (!ws) return; // peer not connected to this DO
    // send() accepts an ArrayBufferView and transmits exactly its byteLength,
    // so pass the cborg Uint8Array directly (its buffer may be over-allocated).
    ws.send(encode(message));
  }

  /** First frame of a socket: the `join`. Returns true once joined. */
  handleJoin(join: WireMessage, ws: WebSocket): boolean {
    const versions = join.supportedProtocolVersions ?? [PROTOCOL_V1];
    if (!versions.includes(PROTOCOL_V1)) {
      ws.send(
        encode({
          type: "error",
          senderId: this.peerId,
          message: "unsupported protocol version",
          targetId: join.senderId,
        }),
      );
      ws.close();
      return false;
    }
    // Announce the newcomer to existing peers and vice-versa BEFORE adding it,
    // so clients sync peer-to-peer THROUGH this relay (live updates) — the
    // relay path (handleFrame) is a stateless socket-forward, robust across
    // hibernation, unlike the server Repo (which handles durable storage).
    for (const [otherId, otherWs] of this.sockets) {
      ws.send(
        encode({
          type: "peer",
          senderId: otherId,
          peerMetadata: {},
          selectedProtocolVersion: PROTOCOL_V1,
          targetId: join.senderId,
        }),
      );
      otherWs.send(
        encode({
          type: "peer",
          senderId: join.senderId,
          peerMetadata: join.peerMetadata ?? {},
          selectedProtocolVersion: PROTOCOL_V1,
          targetId: otherId,
        }),
      );
    }

    this.sockets.set(join.senderId, ws);
    // The server itself is also a peer (durable storage via the in-DO Repo).
    this.emit("peer-candidate", {
      peerId: join.senderId as PeerId,
      peerMetadata: (join.peerMetadata ?? {}) as PeerMetadata,
    });
    ws.send(
      encode({
        type: "peer",
        senderId: this.peerId,
        peerMetadata: this.peerMetadata ?? {},
        selectedProtocolVersion: PROTOCOL_V1,
        targetId: join.senderId,
      }),
    );
    return true;
  }

  /** Post-join frame: deliver to the in-DO Repo, or relay to another peer. */
  handleFrame(raw: ArrayBuffer, msg: WireMessage): void {
    const target = msg.targetId;
    if (target === this.peerId) {
      this.emit("message", msg as unknown as Message);
    } else if (target) {
      const ws = this.sockets.get(target);
      if (ws) ws.send(raw); // raw passthrough — no re-encode
    }
  }

  /**
   * Re-attach a socket AND re-register it as a peer after a hibernation wake.
   * Critical for proactive broadcast: the DO wakes per message and rebuilds a
   * fresh Repo, so unless every connected peer is re-announced, the Repo only
   * knows the message's sender and can't push one peer's change to the others.
   */
  announcePeer(peerId: string, ws: WebSocket, peerMetadata?: unknown): void {
    this.sockets.set(peerId, ws);
    this.emit("peer-candidate", {
      peerId: peerId as PeerId,
      peerMetadata: (peerMetadata ?? {}) as PeerMetadata,
    });
  }

  removePeer(peerId: string): void {
    this.sockets.delete(peerId);
    this.emit("peer-disconnected", { peerId: peerId as PeerId });
  }

  /**
   * Broadcast a "saved" ack to every connected client (R4). `heads` are the
   * document's DURABLE heads — the DO sends this only AFTER the R2 write
   * completes, so a client showing "Saved" is telling the truth: the work is
   * safe to lose the device. A plain broadcast (clients filter by documentId);
   * one DO is one document, so this is one or a few sockets.
   */
  announceSaved(documentId: string, heads: string[]): void {
    const frame = encode({ type: "saved", senderId: this.peerId, documentId, heads });
    for (const ws of this.sockets.values()) {
      try {
        ws.send(frame);
      } catch {
        /* dead socket; the DO's close handler removes it */
      }
    }
  }
}
