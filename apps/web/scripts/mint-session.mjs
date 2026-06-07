/**
 * Mint a dev owner session cookie for local testing — NOT a production bypass.
 * This signs a JWT with the LOCAL dev SESSION_SECRET (the same key the server
 * verifies with); only someone holding the secret can do it, and there is no
 * route in the app that does. It mirrors `src/lib/server/session-core.ts`
 * (HS256, subject = GitHub id) — keep them in sync.
 *
 *   node apps/web/scripts/mint-session.mjs              # owner (Ben), prints `session=<jwt>`
 *   node apps/web/scripts/mint-session.mjs --id 999     # a non-owner, to test rejection
 */
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OWNER_GITHUB_ID = "57852724";
const flagIdx = process.argv.indexOf("--id");
const id = flagIdx !== -1 ? process.argv[flagIdx + 1] : OWNER_GITHUB_ID;

function readSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  for (const rel of ["../.dev.vars", "../.env"]) {
    try {
      const txt = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
      const m = txt.match(/^\s*SESSION_SECRET\s*=\s*(.+?)\s*$/m);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    } catch {
      /* try the next location */
    }
  }
  throw new Error("SESSION_SECRET not found (env, apps/web/.dev.vars, or apps/web/.env)");
}

const ttl = 60 * 60 * 24 * 30;
const now = Math.floor(Date.now() / 1000);
const token = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(id)
  .setIssuedAt(now)
  .setExpirationTime(now + ttl)
  .sign(new TextEncoder().encode(readSecret()));

// dev cookie name has no `__Host-` prefix (http://localhost can't set Secure).
process.stdout.write(`session=${token}\n`);
process.stderr.write(`\n# minted session for GitHub id ${id}\n`);
process.stderr.write(`# curl: curl -s -b 'session=${token}' http://localhost:5173/api/me\n`);
