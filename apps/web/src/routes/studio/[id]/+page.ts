import type { PageLoad } from "./$types";

// id from the route → the document to edit. (ssr=false cascades from the layout.)
export const load: PageLoad = ({ params }) => ({ id: params.id });
