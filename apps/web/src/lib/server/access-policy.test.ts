import { describe, it, expect } from "vitest";
import { decideOwner } from "./access-policy";

const OWNER = "ben@example.com";

describe("decideOwner — the single-admin gate decision (§13), fail-closed", () => {
  it("grants the owner when the verified email matches", () => {
    expect(decideOwner(OWNER, OWNER, false)).toBe(true);
    expect(decideOwner(OWNER, OWNER, true)).toBe(true);
  });

  it("denies a verified NON-owner email", () => {
    expect(decideOwner("attacker@example.com", OWNER, false)).toBe(false);
    expect(decideOwner("attacker@example.com", OWNER, true)).toBe(false); // even in dev
  });

  it("denies a verified email when OWNER_EMAIL is misconfigured (unset)", () => {
    expect(decideOwner(OWNER, undefined, false)).toBe(false);
    expect(decideOwner(OWNER, "", false)).toBe(false);
  });

  it("with NO verified assertion: prod denies, dev allows (localhost)", () => {
    expect(decideOwner(null, OWNER, false)).toBe(false); // prod, no edge assertion → locked out
    expect(decideOwner(null, OWNER, true)).toBe(true); // local dev = your own machine
    expect(decideOwner(null, undefined, false)).toBe(false);
  });
});
