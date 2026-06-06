import { error } from "@sveltejs/kit";
import { getPost } from "$lib/published";
import type { PageServerLoad } from "./$types";

// SSR for instant paint (no editor/CRDT JS ever reaches readers). A small client
// runtime DOES load — only to hold the live SSE channel (§7 #5) so a republish
// updates the page in place. Never a reload/poll.
export const load: PageServerLoad = ({ params }) => {
  const post = getPost(params.slug);
  if (!post) throw error(404, "Not found");
  return { post };
};
