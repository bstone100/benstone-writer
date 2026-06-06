import { listPosts } from "$lib/published";
import type { PageServerLoad } from "./$types";

// SSR for instant paint; a small client runtime holds the live SSE channel so a
// new/updated post appears in the list in place (§7 #5) — no reload/poll.
export const load: PageServerLoad = async ({ platform }) => ({
  posts: await listPosts(platform?.env.DB),
});
