import { listPosts } from "$lib/published";
import type { PageServerLoad } from "./$types";

// The single root surface (ROUND-2 R1): this index IS the writing list. SSR the
// published essays (zero-JS, cacheable, identical for everyone); the owner's
// drafts + New essay load client-side, out-of-band.
export const load: PageServerLoad = async ({ platform }) => ({
  posts: await listPosts(platform?.env.DB),
});
