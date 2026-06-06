import { json, error } from "@sveltejs/kit";
import { RpcContract, type RpcVerb } from "@bw/schema";
import { handlers } from "$lib/server/rpc";
import type { RequestHandler } from "./$types";

/**
 * POST /api/rpc/{verb} — the one RPC door (§14.1.B). Owner-only (gated in
 * hooks.server.ts over /api/rpc; this check is belt-and-suspenders). The verb is
 * looked up in the define-once RpcContract, its input is zod-parsed on ingress
 * (an unschema'd/malformed body physically can't reach a handler, §14), then the
 * matching handler runs and its contract-typed output is returned.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.owner) throw error(401, "unauthorized");

  const verb = params.verb as RpcVerb;
  const spec = RpcContract[verb];
  if (!spec) throw error(404, "unknown rpc verb");

  const parsed = spec.input.safeParse(await request.json());
  if (!parsed.success) throw error(400, "invalid rpc input");

  // Input is validated for THIS verb; the handler map is typed per-verb, so the
  // dynamic dispatch needs one cast (verb is a union at this point).
  const handler = handlers[verb] as (input: unknown) => unknown;
  return json(handler(parsed.data), { headers: { "cache-control": "no-store" } });
};
