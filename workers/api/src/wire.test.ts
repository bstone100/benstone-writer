import { describe, it, expect } from "vitest";
import { encode, decode, isJoin, PROTOCOL_V1, type WireMessage } from "./wire";

// Mirror the real wire: the sender ships exactly the message bytes, the receiver
// decodes that exact ArrayBuffer. (cborg's buffer may be over-allocated, which
// was the "too many terminals" framing bug — guard against its return here.)
function roundtrip(msg: unknown): WireMessage {
  const u8 = encode(msg);
  return decode(new Uint8Array(u8).buffer);
}

describe("wire — cborg encode/decode round-trip (§8.1)", () => {
  it("round-trips the join handshake", () => {
    const join = {
      type: "join",
      senderId: "peer-1",
      peerMetadata: {},
      supportedProtocolVersions: [PROTOCOL_V1],
    };
    const got = roundtrip(join);
    expect(isJoin(got)).toBe(true);
    expect(got.senderId).toBe("peer-1");
    expect(got.supportedProtocolVersions).toEqual(["1"]);
  });

  it("round-trips a sync message and preserves the Uint8Array payload exactly", () => {
    const data = new Uint8Array([0, 1, 2, 250, 255]);
    const got = roundtrip({ type: "sync", senderId: "s", targetId: "t", documentId: "doc", data });
    expect(got.type).toBe("sync");
    expect(got.documentId).toBe("doc");
    expect(got.data).toBeInstanceOf(Uint8Array);
    expect([...(got.data as Uint8Array)]).toEqual([...data]);
  });

  it("isJoin only matches join frames", () => {
    expect(isJoin({ type: "peer", senderId: "s" })).toBe(false);
    expect(isJoin({ type: "sync", senderId: "s" })).toBe(false);
  });
});
