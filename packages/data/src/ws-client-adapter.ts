import {
  NetworkAdapter,
  type Message,
  type PeerId,
  type PeerMetadata,
} from "@automerge/automerge-repo";
import { encode as cborgEncode, decode as cborgDecode } from "cborg";

const PROTOCOL_V1 = "1";

interface WireMessage {
  type: string;
  senderId: PeerId;
  targetId?: PeerId;
  peerMetadata?: PeerMetadata;
  message?: string;
}

/**
 * BrowserWSClientAdapter — our own automerge-repo NetworkAdapter for the
 * browser↔SyncDocDO WebSocket (§8.1). We hand-roll this (instead of the stock
 * `@automerge/automerge-repo-network-websocket`) for two reasons:
 *   1. The stock adapter imports the `/slim` automerge variants, which collide
 *      with our full (WASM-via-vite-plugin) build under Vite's optimizer.
 *   2. It lets both ends use `cborg` (the DO must, since cbor-x can't run in
 *      workerd) → identical encoders, guaranteed wire compatibility.
 * It mirrors the stock client's protocol exactly: send `join` on open, expect
 * `peer`, then exchange repo messages.
 */
export class BrowserWSClientAdapter extends NetworkAdapter {
  #socket?: WebSocket;
  #ready = false;
  #resolveReady?: () => void;
  readonly #readyPromise: Promise<void>;
  readonly #remotePeers = new Set<PeerId>();
  #closed = false;

  constructor(
    private readonly url: string,
    private readonly retryMs = 3000,
  ) {
    super();
    this.#readyPromise = new Promise((resolve) => (this.#resolveReady = resolve));
  }

  isReady(): boolean {
    return this.#ready;
  }

  whenReady(): Promise<void> {
    return this.#readyPromise;
  }

  #markReady(): void {
    if (this.#ready) return;
    this.#ready = true;
    this.#resolveReady?.();
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata ?? ({} as PeerMetadata);
    this.#open();
  }

  #open(): void {
    if (this.#closed) return;
    const socket = new WebSocket(this.url);
    socket.binaryType = "arraybuffer";
    this.#socket = socket;
    socket.addEventListener("open", () => this.#join());
    socket.addEventListener("message", (e) => this.#receive(e.data as ArrayBuffer));
    socket.addEventListener("close", () => this.#onClose());
    socket.addEventListener("error", () => socket.close());
    // Don't block the repo forever if the server is unreachable.
    setTimeout(() => this.#markReady(), 1000);
  }

  #join(): void {
    this.#rawSend({
      type: "join",
      senderId: this.peerId,
      peerMetadata: this.peerMetadata,
      supportedProtocolVersions: [PROTOCOL_V1],
    });
  }

  #receive(raw: ArrayBuffer): void {
    if (raw.byteLength === 0) return;
    let msg: WireMessage;
    try {
      msg = cborgDecode(new Uint8Array(raw)) as WireMessage;
    } catch (err) {
      console.warn("[sync] dropped undecodable frame:", (err as Error).message);
      return;
    }
    if (msg.type === "peer") {
      // One socket carries multiple peers: the server (storage) + every other
      // client (live, via the relay). Register each so the Repo syncs with all.
      this.#remotePeers.add(msg.senderId);
      this.#markReady();
      this.emit("peer-candidate", {
        peerId: msg.senderId,
        peerMetadata: msg.peerMetadata ?? ({} as PeerMetadata),
      });
    } else if (msg.type === "error") {
      // Server-side protocol error; surface for debugging, don't crash sync.
      console.warn("[sync] server error:", msg.message);
    } else {
      this.emit("message", msg as unknown as Message);
    }
  }

  send(message: Message): void {
    const data = (message as { data?: Uint8Array }).data;
    if (data && data.byteLength === 0) return; // never send zero-length
    this.#rawSend(message);
  }

  #rawSend(message: unknown): void {
    if (this.#socket?.readyState !== WebSocket.OPEN) return;
    // Copy into a fresh, exactly-sized Uint8Array: tight framing (cborg's buffer
    // may be over-allocated) and a plain ArrayBuffer backing (satisfies send()).
    this.#socket.send(new Uint8Array(cborgEncode(message)));
  }

  #onClose(): void {
    for (const peerId of this.#remotePeers) {
      this.emit("peer-disconnected", { peerId });
    }
    this.#remotePeers.clear();
    if (!this.#closed) setTimeout(() => this.#open(), this.retryMs);
  }

  disconnect(): void {
    this.#closed = true;
    this.#socket?.close();
    this.#socket = undefined;
  }
}
