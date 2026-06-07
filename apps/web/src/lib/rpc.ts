import type { RpcVerb, RpcInput, RpcOutput } from "@bw/schema";

/**
 * The typed RPC client (§14.1.B, ROUND-2 R5) — the browser half of the define-once
 * contract. Each method is fully inferred from the RpcContract in @bw/schema (input
 * AND output), so client and server cannot drift. The ONE place a feature reaches
 * the Worker for an imperative verb; content edits stay local mutate() → Automerge.
 */
async function call<V extends RpcVerb>(verb: V, input: RpcInput<V>): Promise<RpcOutput<V>> {
  const res = await fetch(`/api/rpc/${verb}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`rpc ${verb} failed (${res.status})`);
  return (await res.json()) as RpcOutput<V>;
}

export const rpc = {
  /** Make a version live (Make live ⋮). */
  makeLive: (input: RpcInput<"makeLive">) => call("makeLive", input),
  /** Attach a human name to a version (Name version ⋮). */
  nameVersion: (input: RpcInput<"nameVersion">) => call("nameVersion", input),
  /** Fetch the doc's version metadata (live pointer + released/named versions). */
  versions: (input: RpcInput<"versions">) => call("versions", input),
  /** Take the doc down. */
  unpublish: (input: RpcInput<"unpublish">) => call("unpublish", input),
};
