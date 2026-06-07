import { bodyForPublish } from "@bw/data";
import { basicSchemaAdapter, pmDocFromSpans } from "@automerge/prosemirror";
import { DOMSerializer, type Node as PMNode } from "prosemirror-model";
import type { PublishRequest } from "@bw/schema";

/**
 * renderForPublish(id) — render a document's Automerge body to STATIC HTML (§4)
 * using the SAME schema the editor binds to (`basicSchemaAdapter`), so the
 * published page is identical to what you wrote — edit and read are two views of
 * one schema, not two renderers. Runs client-side at publish time (the browser
 * has a DOM for `DOMSerializer`); the reader then ships zero editor/CRDT JS. The
 * projection is keyed by the document id — the UUID that IS the URL
 * (/documents/{id}); there are no slugs (ROUND-2 R2).
 *
 * Safe by construction: `DOMSerializer` only emits nodes/marks defined in our
 * schema, so the HTML can't contain arbitrary/script markup.
 */
export async function renderForPublish(id: string): Promise<PublishRequest> {
  const { title, spans } = await bodyForPublish(id);
  const node: PMNode = pmDocFromSpans(
    basicSchemaAdapter,
    spans as Parameters<typeof pmDocFromSpans>[1],
  );
  const serializer = DOMSerializer.fromSchema(basicSchemaAdapter.schema);
  const container = document.createElement("div");
  container.appendChild(serializer.serializeFragment(node.content));
  const html = container.innerHTML;
  // Join block texts with a space so paragraph boundaries don't run together.
  const excerpt = Array.from(container.children)
    .map((el) => el.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return { id, title, html, excerpt };
}
