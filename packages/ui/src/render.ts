import { bodyForPublish } from "@bw/data";
import { basicSchemaAdapter, pmDocFromSpans } from "@automerge/prosemirror";
import { DOMSerializer, type Node as PMNode } from "prosemirror-model";
import type { PublishRequest } from "@bw/schema";

/**
 * renderForPublish(id, slug) — render a document's Automerge body to STATIC HTML
 * (§4) using the SAME schema the editor binds to (`basicSchemaAdapter`), so the
 * published page is identical to what you wrote — edit and read are two views of
 * one schema, not two renderers. Runs client-side at publish time (the browser
 * has a DOM for `DOMSerializer`); the reader then ships zero editor/CRDT JS.
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
  const excerpt = (container.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  return { slug: slugify(title), title, html, excerpt, sourceId: id };
}

/** slugify(title) — a URL-safe slug from a title. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled"
  );
}
