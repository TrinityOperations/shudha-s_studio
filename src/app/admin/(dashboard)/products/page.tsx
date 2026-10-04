import type { Metadata } from "next";
import Link from "next/link";
import { PackageIcon } from "lucide-react";
import { ProductFilters } from "@/components/admin/product-filters";
import { ProductTable } from "@/components/admin/product-table";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { countProducts, listProducts, type ProductListFilters } from "@/db/queries/products";
import { listCategories } from "@/db/queries/taxonomy";
import { productStatusEnum } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.products.title") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireOwner();
  const params = await searchParams;
  const status = first(params.status) ?? "";
  const categoryId = first(params.category) ?? "";
  const q = first(params.q) ?? "";

  const filters: ProductListFilters = {
    status: (productStatusEnum.enumValues as readonly string[]).includes(status)
      ? (status as ProductListFilters["status"])
      : undefined,
    categoryId: UUID.test(categoryId) ? categoryId : undefined,
    q: q || undefined,
  };

  const [t, rows, categories, total] = await Promise.all([
    getT(),
    listProducts(filters),
    listCategories(),
    countProducts(),
  ]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.products.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/taxonomy" className={buttonVariants({ variant: "outline" })}>
            {t("admin.products.manageTaxonomy")}
          </Link>
          <Link href="/admin/products/new" className={buttonVariants()}>
            {t("admin.products.new")}
          </Link>
        </div>
      </header>

      {total === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>{t("admin.products.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("admin.products.empty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/admin/products/new" className={buttonVariants()}>
              {t("admin.products.new")}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ProductFilters
            categories={categories}
            status={filters.status ?? ""}
            categoryId={filters.categoryId ?? ""}
            q={filters.q ?? ""}
          />
          <ProductTable rows={rows} />
        </>
      )}
    </section>
  );
}
