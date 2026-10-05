/** Lowercase ASCII letters, digits and single hyphens. Non-Latin input (e.g. Bengali) yields "".
 *  Pure and client-safe; the DB-aware ensureUniqueSlug lives in slug.ts. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
