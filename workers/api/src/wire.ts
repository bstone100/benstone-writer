import { encode as cborgEncode, decode as cborgDecode } from "cborg";

/**
 * Wire protocol — the bytes on the WebSocket (§8.1). automerge-repo's official
 * transport encodes with `cbor-x`, which can't run in workerd (it calls
 * `new Function()` → EvalError). So the DO encodes/decodes with `cborg`
 * instead. The two are cross-decodable for our message shapes (verified by a
 * round-trip test, incl. Uint8Array payloads), which is what lets a stock
 * browser `WebSocketClientAdapter` (cbor-x) talk to this DO (cborg).
 */

export const PROTOCOL_V1 = "1";

/** The transport-level message shapes (join/peer/error) plus relayed frames. */
export interface WireMessage {
  type: string;
  senderId: string;
  targetId?: string;
  documentId?: string;
  data?: Uint8Array;
  peerMetadata?: unknown;
  supportedProtocolVersions?: string[];
  selectedProtocolVersion?: string;
  message?: string;
}

export function encode(message: unknown): Uint8Array {
  return cborgEncode(message);
}

export function decode(buf: ArrayBuffer): WireMessage {
  return cborgDecode(new Uint8Array(buf)) as WireMessage;
}

export function isJoin(m: WireMessage): boolean {
  return m.type === "join";
}
