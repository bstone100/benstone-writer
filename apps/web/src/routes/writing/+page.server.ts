import { listPosts } from "$lib/published";
import type { PageServerLoad } from "./$types";

// Public index: static, zero client JS (§11.6).
export const csr = false;

export const load: PageServerLoad = () => ({ posts: listPosts() });
