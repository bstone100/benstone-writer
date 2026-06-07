import { describe, it, expect } from "vitest";
import { signSession, verifySession, verifyState, isOwnerId } from "./session-core";

const SECRET = "test-secret-please-ignore-0123456789abcdef";
const OTHER_SECRET = "a-completely-different-secret-9876543210";
const OWNER = "57852724"; // Ben's GitHub id

describe("session crypto (HS256/jose) — roundtrip + tamper/forgery/expiry", () => {
  it("round-trips the GitHub id through sign → verify", async () => {
    const token = await signSession(OWNER, SECRET);
    expect(await verifySession(token, SECRET)).toBe(OWNER);
  });

  it("rejects a token signed with a DIFFERENT secret (forgery)", async () => {
    const token = await signSession(OWNER, OTHER_SECRET);
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(OWNER, SECRET);
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(await verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejects an EXPIRED token (negative TTL → exp in the past)", async () => {
    const token = await signSession(OWNER, SECRET, -100);
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it("rejects garbage / empty input", async () => {
    expect(await verifySession("not.a.jwt", SECRET)).toBeNull();
    expect(await verifySession("", SECRET)).toBeNull();
  });
});

describe("verifyState — OAuth CSRF: callback state must match the stored state", () => {
  it("accepts ONLY an exact match", () => {
    expect(verifyState("abc123XYZ", "abc123XYZ")).toBe(true);
  });

  it("rejects a mismatch, and missing/empty state on either side", () => {
    expect(verifyState("abc123XYZ", "tampered")).toBe(false); // state-mismatch
    expect(verifyState(undefined, "abc123XYZ")).toBe(false); // no cookie (e.g. SameSite ate it)
    expect(verifyState("abc123XYZ", null)).toBe(false); // no query state
    expect(verifyState("", "")).toBe(false); // empty is never a valid match
  });
});

describe("isOwnerId — the single-admin gate, fail-closed", () => {
  it("grants ONLY the configured owner id", () => {
    expect(isOwnerId(OWNER, OWNER)).toBe(true);
  });

  it("denies any other id and a missing session (non-owner rejection)", () => {
    expect(isOwnerId("99999999", OWNER)).toBe(false);
    expect(isOwnerId(null, OWNER)).toBe(false);
  });
});
