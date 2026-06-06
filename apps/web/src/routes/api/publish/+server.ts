import { json, error } from "@sveltejs/kit";
import { PublishRequestSchema } from "@bw/schema";
import { upsertPost } from "$lib/published";
import { emitFeed } from "$lib/server/feed";
import type { RequestHandler } from "./$types";

/**
 * POST /api/publish — accept a pre-rendered post (rendered client-side from our
 * schema, §4) and store it for the public reader. Owner-only: the route is under
 * the `/api/publish` gate in hooks.server.ts (Cloudflare Access); this check is
 * belt-and-suspenders.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.owner) throw error(401, "unauthorized");
  const parsed = PublishRequestSchema.safeParse(await request.json());
  if (!parsed.success) throw error(400, "invalid publish request");
  const post = upsertPost(parsed.data, Date.now());
  emitFeed({ type: "published", slug: post.slug }); // push live to open readers
  return json({ slug: post.slug, publishedAt: post.publishedAt });
};
