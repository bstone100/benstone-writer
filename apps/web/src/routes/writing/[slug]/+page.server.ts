import { error } from "@sveltejs/kit";
import { getPost } from "$lib/published";
import type { PageServerLoad } from "./$types";

// The reader is read-only content: ship ZERO client JS (§11.6 — instant paint,
// fully cacheable). SSR-only, no hydration.
export const csr = false;

// SSR the pre-rendered post; the page ships zero editor/CRDT JS.
export const load: PageServerLoad = ({ params }) => {
  const post = getPost(params.slug);
  if (!post) throw error(404, "Not found");
  return { post };
};
