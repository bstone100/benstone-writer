import { error } from "@sveltejs/kit";
import { getPost } from "$lib/published";
import type { PageServerLoad } from "./$types";

// ONE surface (ROUND-2 R1/R2): /documents/{id} is read-only SSR for visitors and
// edit-in-place for the owner — the id IS the URL, no slug. A PUBLISHED doc
// renders its projection for everyone (cacheable, zero editor JS). An unpublished
// DRAFT is owner-only: a visitor gets 404, the owner gets the editor (the load
// proves the owner via locals.owner, set by hooks).
export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const post = await getPost(platform?.env.DB, params.id);
  if (post) return { id: params.id, post };
  if (locals.owner) return { id: params.id, post: null };
  throw error(404, "Not found");
};
