import type { Metadata } from "next";
import { CatalogueFilters } from "@/components/public/catalogue/catalogue-filters";
import { CataloguePagination } from "@/components/public/catalogue/pagination";
import { ProductCard } from "@/components/public/catalogue/product-card";
import { getCatalogueTaxonomy, listPublishedProducts } from "@/db/queries/catalogue";
import { getLocale, getT } from "@/lib/i18n";
import { parseCatalogueSearchParams } from "@/lib/validators/catalogue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("catalogue.title"),
    description: t("catalogue.metaDescription"),
  };
}

export default async function CataloguePage({ searchParams }: PageProps<"/products">) {
  const filters = parseCatalogueSearchParams(await searchParams);
  const [result, taxonomy, locale, t] = await Promise.all([
    listPublishedProducts(filters),
    getCatalogueTaxonomy(),
    getLocale(),
    getT(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:py-14">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("catalogue.title")}
        </h1>
        <p className="text-muted-foreground">{t("catalogue.description")}</p>
      </header>

      <CatalogueFilters filters={filters} taxonomy={taxonomy} locale={locale} t={t} />

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <p aria-live="polite">{t("catalogue.resultCount", { count: result.total })}</p>
        {result.total > 0 ? <p>{t("catalogue.noPrices")}</p> : null}
      </div>

      {result.products.length ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                t={t}
                priority={result.page === 1 && index < 3}
              />
            ))}
          </div>
          <CataloguePagination
            filters={filters}
            page={result.page}
            pageCount={result.pageCount}
            t={t}
          />
        </>
      ) : (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">{t("catalogue.emptyTitle")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("catalogue.emptyDescription")}</p>
        </div>
      )}
    </div>
  );
}
