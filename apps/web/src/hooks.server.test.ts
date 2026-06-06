import { describe, it, expect, vi, beforeEach } from "vitest";

// isOwner is the auth INPUT (it verifies the Cloudflare Access assertion via
// jose — unit-tested separately as decideOwner). Here we mock it to drive the
// GATE logic across the (path × owner) matrix — the security-critical seam.
vi.mock("$lib/server/access", () => ({ isOwner: vi.fn() }));

import { handle } from "./hooks.server";
import { isOwner } from "$lib/server/access";

const owner = vi.mocked(isOwner);

type HandleArg = Parameters<typeof handle>[0];
function run(pathname: string) {
  const event = { url: new URL(`http://localhost${pathname}`), locals: {} as { owner?: unknown } };
  const resolve = vi.fn(() => "RESOLVED" as unknown);
  return { event, resolve, call: () => handle({ event, resolve } as unknown as HandleArg) };
}

beforeEach(() => owner.mockReset());

describe("auth gate (hooks.server) — one gate, public-by-default (§13)", () => {
  it("lets a non-owner through a public path", async () => {
    owner.mockResolvedValue(false);
    const { call, resolve, event } = run("/writing/some-post");
    await expect(call()).resolves.toBe("RESOLVED");
    expect(resolve).toHaveBeenCalledWith(event);
  });

  it("redirects a non-owner away from /studio", async () => {
    owner.mockResolvedValue(false);
    await expect(run("/studio").call()).rejects.toMatchObject({ status: 303, location: "/" });
  });

  it("401s a non-owner hitting an /api/rpc verb (no redirect for APIs)", async () => {
    owner.mockResolvedValue(false);
    await expect(run("/api/rpc/publish").call()).rejects.toMatchObject({ status: 401 });
  });

  it("lets the owner into the private surface", async () => {
    owner.mockResolvedValue(true);
    await expect(run("/studio").call()).resolves.toBe("RESOLVED");
    owner.mockResolvedValue(true);
    await expect(run("/api/rpc/publish").call()).resolves.toBe("RESOLVED");
  });

  it("always records the resolved owner on locals", async () => {
    owner.mockResolvedValue(true);
    const { call, event } = run("/writing/x");
    await call();
    expect(event.locals.owner).toBe(true);
  });
});
