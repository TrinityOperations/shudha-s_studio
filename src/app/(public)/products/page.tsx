import type { Metadata } from "next";
import { CatalogueFilters } from "@/components/public/catalogue/catalogue-filters";
import { Pagination } from "@/components/public/catalogue/pagination";
import { ProductCard } from "@/components/public/catalogue/product-card";
import { listCatalogue, listCatalogueFacets } from "@/db/queries/catalogue";
import { getT } from "@/lib/i18n";
import { parseCatalogueParams } from "@/lib/validators/catalogue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("catalogue.title"), alternates: { canonical: "/products" } };
}

/** PW-10..15: the public catalogue. Published products only (enforced in queries/catalogue.ts). */
export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const params = parseCatalogueParams(await searchParams);
  const [t, result, facets] = await Promise.all([
    getT(),
    listCatalogue(params),
    listCatalogueFacets(),
  ]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 lg:py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("catalogue.title")}</h1>
      <CatalogueFilters facets={facets} params={params} />
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {result.total === 1
          ? t("catalogue.resultsOne")
          : t("catalogue.results", { count: result.total })}
      </p>
      {result.items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} priority={index < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground py-12 text-center">{t("catalogue.empty")}</p>
      )}
      <Pagination params={params} page={result.page} pageCount={result.pageCount} />
    </section>
  );
}
