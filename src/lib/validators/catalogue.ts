import { z } from "zod";
import { SLUG_PATTERN } from "./products";

export const CATALOGUE_PAGE_SIZE = 24;
export const CATALOGUE_MAX_FILTER_VALUES = 20;
export const CATALOGUE_MAX_QUERY_LENGTH = 100;

export const catalogueSortSchema = z.enum(["newest", "featured"]);
export type CatalogueSort = z.infer<typeof catalogueSortSchema>;

/** `?category=mugs&category=cards` or `?category=mugs`; unknown shapes and bad slugs are dropped. */
const slugListSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    const list = value === undefined ? [] : Array.isArray(value) ? value : [value];
    return Array.from(new Set(list.filter((slug) => SLUG_PATTERN.test(slug)))).slice(
      0,
      CATALOGUE_MAX_FILTER_VALUES,
    );
  });

const queryTextSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    const first = Array.isArray(value) ? value[0] : value;
    return (first ?? "").trim().slice(0, CATALOGUE_MAX_QUERY_LENGTH);
  });

/**
 * Public catalogue URL params (PW-11..13, PW-15). Invalid values fall back to defaults so a
 * hand-edited or stale link never errors.
 */
export const catalogueParamsSchema = z.object({
  category: slugListSchema,
  occasion: slugListSchema,
  tag: slugListSchema,
  q: queryTextSchema,
  sort: catalogueSortSchema.catch("newest"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type CatalogueParams = z.output<typeof catalogueParamsSchema>;

export const defaultCatalogueParams: CatalogueParams = {
  category: [],
  occasion: [],
  tag: [],
  q: "",
  sort: "newest",
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Never throws: anything unparseable becomes the defaults. */
export function parseCatalogueParams(raw: RawSearchParams): CatalogueParams {
  const result = catalogueParamsSchema.safeParse(raw);
  return result.success ? result.data : defaultCatalogueParams;
}

/** Back to a query string (page omitted when 1) so links, chips and pagination share one builder. */
export function catalogueSearchParams(
  params: CatalogueParams,
  overrides: Partial<CatalogueParams> = {},
): URLSearchParams {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const key of ["category", "occasion", "tag"] as const) {
    for (const slug of merged[key]) search.append(key, slug);
  }
  if (merged.q) search.set("q", merged.q);
  if (merged.sort !== "newest") search.set("sort", merged.sort);
  if (merged.page > 1) search.set("page", String(merged.page));
  return search;
}

export function catalogueHref(params: CatalogueParams, overrides: Partial<CatalogueParams> = {}) {
  const query = catalogueSearchParams(params, overrides).toString();
  return query ? `/products?${query}` : "/products";
}
