import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { T } from "@/lib/i18n/t";
import type { ParsedCatalogueSearchParams } from "@/lib/validators/catalogue";

function pageHref(filters: ParsedCatalogueSearchParams, page: number) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.occasion) params.set("occasion", filters.occasion);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export function CataloguePagination({
  filters,
  page,
  pageCount,
  t,
}: {
  filters: ParsedCatalogueSearchParams;
  page: number;
  pageCount: number;
  t: T;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label={t("catalogue.paginationLabel")}
      className="flex items-center justify-center gap-3"
    >
      {page > 1 ? (
        <Link href={pageHref(filters, page - 1)} className={buttonVariants({ variant: "outline" })}>
          {t("catalogue.previous")}
        </Link>
      ) : (
        <span aria-hidden="true" className="w-20" />
      )}
      <span className="text-muted-foreground text-sm">
        {t("catalogue.pageCount", { page, pageCount })}
      </span>
      {page < pageCount ? (
        <Link href={pageHref(filters, page + 1)} className={buttonVariants({ variant: "outline" })}>
          {t("catalogue.next")}
        </Link>
      ) : (
        <span aria-hidden="true" className="w-20" />
      )}
    </nav>
  );
}
