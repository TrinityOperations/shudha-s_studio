import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n";
import { catalogueHref, type CatalogueParams } from "@/lib/validators/catalogue";

type Props = { params: CatalogueParams; page: number; pageCount: number };

/** Simple previous/next paging (PW-15). Filters are kept in the links. */
export async function Pagination({ params, page, pageCount }: Props) {
  if (pageCount <= 1) return null;
  const t = await getT();

  return (
    <nav
      aria-label={t("catalogue.pagination.label")}
      className="flex items-center justify-between gap-4 pt-6"
    >
      {page > 1 ? (
        <Link
          href={catalogueHref(params, { page: page - 1 })}
          rel="prev"
          className={buttonVariants({ variant: "outline" })}
        >
          {t("catalogue.pagination.previous")}
        </Link>
      ) : (
        <span />
      )}
      <p className="text-muted-foreground text-sm">
        {t("catalogue.pagination.page", { page, total: pageCount })}
      </p>
      {page < pageCount ? (
        <Link
          href={catalogueHref(params, { page: page + 1 })}
          rel="next"
          className={buttonVariants({ variant: "outline" })}
        >
          {t("catalogue.pagination.next")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
