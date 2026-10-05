import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogueTaxonomy } from "@/db/queries/catalogue";
import type { Locale } from "@/lib/i18n";
import type { T } from "@/lib/i18n/t";
import type { ParsedCatalogueSearchParams } from "@/lib/validators/catalogue";

function label(item: { name: string; nameBn: string | null }, locale: Locale) {
  return locale === "bn" && item.nameBn ? item.nameBn : item.name;
}

export function CatalogueFilters({
  filters,
  taxonomy,
  locale,
  t,
}: {
  filters: ParsedCatalogueSearchParams;
  taxonomy: CatalogueTaxonomy;
  locale: Locale;
  t: T;
}) {
  const hasFilters = Boolean(
    filters.category || filters.occasion || filters.tag || filters.q || filters.sort === "featured",
  );

  return (
    <form
      action="/products"
      method="get"
      className="bg-card grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="catalogue-q">{t("catalogue.search")}</Label>
        <Input
          id="catalogue-q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder={t("catalogue.searchPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="catalogue-category">{t("catalogue.category")}</Label>
        <select
          id="catalogue-category"
          name="category"
          defaultValue={filters.category ?? ""}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          <option value="">{t("catalogue.allCategories")}</option>
          {taxonomy.categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {label(item, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="catalogue-occasion">{t("catalogue.occasion")}</Label>
        <select
          id="catalogue-occasion"
          name="occasion"
          defaultValue={filters.occasion ?? ""}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          <option value="">{t("catalogue.allOccasions")}</option>
          {taxonomy.occasions.map((item) => (
            <option key={item.slug} value={item.slug}>
              {label(item, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="catalogue-tag">{t("catalogue.tag")}</Label>
        <select
          id="catalogue-tag"
          name="tag"
          defaultValue={filters.tag ?? ""}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          <option value="">{t("catalogue.allTags")}</option>
          {taxonomy.tags.map((item) => (
            <option key={item.slug} value={item.slug}>
              {label(item, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="catalogue-sort">{t("catalogue.sort")}</Label>
        <select
          id="catalogue-sort"
          name="sort"
          defaultValue={filters.sort}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          <option value="newest">{t("catalogue.sortNewest")}</option>
          <option value="featured">{t("catalogue.sortFeatured")}</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit">{t("catalogue.applyFilters")}</Button>
        {hasFilters ? (
          <Link href="/products" className={buttonVariants({ variant: "ghost" })}>
            {t("catalogue.clearFilters")}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
