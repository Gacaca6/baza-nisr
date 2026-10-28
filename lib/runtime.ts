// Static builds run the answer engine in the browser and expose no API routes; server builds keep the documented HTTP surface.
export const staticMode = process.env.NEXT_PUBLIC_BAZA_STATIC === "1";
// A project site served from a subpath needs that subpath in generated embed snippets.
export const basePath = process.env.NEXT_PUBLIC_BAZA_BASE ?? "";
export const siteRoot = () => `${location.origin}${basePath}`;
