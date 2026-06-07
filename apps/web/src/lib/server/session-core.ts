/**
 * Pure, $env-free session/auth crypto (the round-two analogue of round one's
 * `access-policy.ts`): EVERYTHING security-critical lives here so it unit-tests
 * without SvelteKit's virtual modules. jose runs on WebCrypto → byte-identical in
 * node (tests), the browser, and workerd (prod). The $env + cookie glue is in
 * `session.ts`; the OAuth handshake is in `github.ts`; the gate is in `auth.ts`.
 */
import { SignJWT, jwtVerify } from "jose";

const enc = new TextEncoder();
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Sign a session: an HS256 JWT whose subject is the owner's GitHub numeric id. */
export async function signSession(
  githubId: string,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(githubId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(enc.encode(secret));
}

/** Verify a session token; returns the subject (GitHub id) or null on ANY failure. */
export async function verifySession(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, enc.encode(secret), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null; // bad signature, expired, malformed → not authenticated
  }
}

/** OAuth CSRF check: the state GitHub echoes back must equal the one we stored. */
export function verifyState(cookieState: string | undefined, queryState: string | null): boolean {
  return typeof cookieState === "string" && cookieState.length > 0 && cookieState === queryState;
}

/** The single-admin gate: an id is the owner iff it exactly equals the owner id. */
export function isOwnerId(githubId: string | null, ownerId: string): boolean {
  return githubId !== null && githubId === ownerId;
}
