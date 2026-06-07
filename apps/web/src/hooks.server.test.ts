import { describe, it, expect, vi, beforeEach } from "vitest";

// isOwner is the auth INPUT (it verifies the GitHub session via jose — unit-
// tested separately in session-core.test.ts). Here we mock it to drive the GATE
// logic across the (path × owner) matrix — the security-critical seam.
vi.mock("$lib/server/auth", () => ({ isOwner: vi.fn() }));

import { handle } from "./hooks.server";
import { isOwner } from "$lib/server/auth";

const owner = vi.mocked(isOwner);

type HandleArg = Parameters<typeof handle>[0];
function run(pathname: string) {
  const event = { url: new URL(`http://localhost${pathname}`), locals: {} as { owner?: unknown } };
  const resolve = vi.fn(() => "RESOLVED" as unknown);
  return { event, resolve, call: () => handle({ event, resolve } as unknown as HandleArg) };
}

beforeEach(() => owner.mockReset());

describe("auth gate (hooks.server) — one gate, public-by-default (ROUND-2 R1/R3)", () => {
  it("lets a non-owner through a public essay page (the reader plane)", async () => {
    owner.mockResolvedValue(false);
    const { call, resolve, event } = run("/documents/abc123");
    await expect(call()).resolves.toBe("RESOLVED");
    expect(resolve).toHaveBeenCalledWith(event);
  });

  it("lets a non-owner through the index", async () => {
    owner.mockResolvedValue(false);
    await expect(run("/").call()).resolves.toBe("RESOLVED");
  });

  it("401s a non-owner hitting an /api/rpc verb (no redirect for APIs)", async () => {
    owner.mockResolvedValue(false);
    await expect(run("/api/rpc/publish").call()).rejects.toMatchObject({ status: 401 });
  });

  it("lets the owner into the private RPC surface", async () => {
    owner.mockResolvedValue(true);
    await expect(run("/api/rpc/publish").call()).resolves.toBe("RESOLVED");
  });

  it("always records the resolved owner on locals", async () => {
    owner.mockResolvedValue(true);
    const { call, event } = run("/documents/x");
    await call();
    expect(event.locals.owner).toBe(true);
  });
});
