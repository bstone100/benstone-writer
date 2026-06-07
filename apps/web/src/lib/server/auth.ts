import type { RequestEvent } from "@sveltejs/kit";
import { isOwnerId } from "./session-core";
import { readSessionId } from "./session";

/**
 * The site owner's immutable GitHub numeric id (Ben — `bstone100`). This is
 * PUBLIC — anyone can read it from `api.github.com/users/bstone100` — so it is
 * NOT a secret and lives in code. The gate authenticates exactly this one
 * identity and nobody else (ROUND-2 §R3); it never trusts the username, which a
 * user can change, only the immutable id.
 */
export const OWNER_GITHUB_ID = "57852724";

/** True only for the site owner: a session cookie whose verified id matches. */
export async function isOwner(event: RequestEvent): Promise<boolean> {
  return isOwnerId(await readSessionId(event.cookies), OWNER_GITHUB_ID);
}
