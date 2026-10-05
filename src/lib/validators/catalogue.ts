import { z } from "zod";

const queryValue = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (Array.isArray(value) ? value[0] : value));

const slugFilter = queryValue.pipe(
  z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional()
    .catch(undefined),
);

export const CATALOGUE_PAGE_SIZE = 12;

export const catalogueSearchParamsSchema = z.object({
  category: slugFilter,
  occasion: slugFilter,
  tag: slugFilter,
  q: queryValue.pipe(z.string().trim().max(100).optional().catch(undefined)),
  sort: queryValue.pipe(z.enum(["newest", "featured"]).optional().catch(undefined)),
  page: queryValue.transform((value) => {
    if (!value || !/^\d+$/.test(value)) return undefined;
    const page = Number(value);
    return page >= 1 && page <= 10_000 ? page : undefined;
  }),
});

export type CatalogueSearchParams = z.infer<typeof catalogueSearchParamsSchema>;
export type ParsedCatalogueSearchParams = Omit<CatalogueSearchParams, "sort" | "page"> & {
  sort: "newest" | "featured";
  page: number;
};

export function parseCatalogueSearchParams(
  input: Record<string, string | string[] | undefined>,
): ParsedCatalogueSearchParams {
  const parsed = catalogueSearchParamsSchema.parse(input);
  return {
    ...parsed,
    q: parsed.q || undefined,
    sort: parsed.sort ?? "newest",
    page: parsed.page ?? 1,
  };
}
