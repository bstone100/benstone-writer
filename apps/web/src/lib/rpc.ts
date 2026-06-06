import type { RpcVerb, RpcInput, RpcOutput } from "@bw/schema";

/**
 * The typed RPC client (§14.1.B) — the browser half of the define-once contract.
 * `rpc.publish(input)` / `rpc.unpublish(input)` are fully inferred from the
 * RpcContract in @bw/schema (input AND output), so client and server cannot
 * drift. The ONE place a feature reaches the Worker for an imperative verb;
 * everything else is local mutate() → Automerge → sync.
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
  publish: (input: RpcInput<"publish">) => call("publish", input),
  unpublish: (input: RpcInput<"unpublish">) => call("unpublish", input),
};
