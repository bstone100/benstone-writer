import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * GET /api/me — the owner-probe (§11.5). A public page (`/documents/{id}`) stays
 * anonymous + cacheable; the owner's browser calls this AFTER paint to reveal an
 * Edit control. Identity is resolved out-of-band, so the article HTML never
 * varies by viewer and the cache stays intact.
 */
export const GET: RequestHandler = ({ locals }) =>
  json({ owner: locals.owner }, { headers: { "cache-control": "no-store" } });
