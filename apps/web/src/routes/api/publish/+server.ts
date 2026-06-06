import { json, error } from "@sveltejs/kit";
import { PublishRequestSchema } from "@bw/schema";
import { upsertPost } from "$lib/published";
import type { RequestHandler } from "./$types";

/**
 * POST /api/publish — accept a pre-rendered post (rendered client-side from our
 * schema, §4) and store it for the public reader. The author-only auth gate
 * lands here with passkeys (#6); for now the dev endpoint is open.
 */
export const POST: RequestHandler = async ({ request }) => {
  const parsed = PublishRequestSchema.safeParse(await request.json());
  if (!parsed.success) throw error(400, "invalid publish request");
  const post = upsertPost(parsed.data, Date.now());
  return json({ slug: post.slug, publishedAt: post.publishedAt });
};
