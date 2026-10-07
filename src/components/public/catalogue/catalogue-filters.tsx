"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogueFacets, CatalogueTerm } from "@/db/queries/catalogue";
import { useLocale, useT } from "@/lib/i18n/client";
import {
  catalogueHref,
  parseCatalogueParams,
  type CatalogueParams,
  type RawSearchParams,
} from "@/lib/validators/catalogue";
import { localised } from "./localised";

type Props = { facets: CatalogueFacets; params: CatalogueParams };

type FilterKey = "category" | "occasion" | "tag";

/**
 * PW-11..13: a plain GET form so the URL is the state and everything works without JavaScript.
 * With JavaScript, checkboxes and the sort select submit as soon as they change.
 */
export function CatalogueFilters({ facets, params }: Props) {
  const t = useT();
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  /** With JavaScript, build the same clean URL the server links use (no empty q, no default sort). */
  function submitClean(form: HTMLFormElement) {
    const raw: RawSearchParams = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value !== "string") continue;
      const existing = raw[key];
      raw[key] =
        existing === undefined
          ? value
          : [...(Array.isArray(existing) ? existing : [existing]), value];
    }
    router.push(catalogueHref(parseCatalogueParams(raw)));
  }

  const groups: { key: FilterKey; label: string; terms: CatalogueTerm[] }[] = [
    { key: "category", label: t("catalogue.filters.category"), terms: facets.categories },
    { key: "occasion", label: t("catalogue.filters.occasion"), terms: facets.occasions },
    { key: "tag", label: t("catalogue.filters.tag"), terms: facets.tags },
  ];

  const active = groups.flatMap(({ key, terms }) =>
    params[key].map((slug) => ({
      key,
      slug,
      name: localised(
        locale,
        terms.find((term) => term.slug === slug)?.name ?? slug,
        terms.find((term) => term.slug === slug)?.nameBn,
      ),
    })),
  );
  const hasAnything = active.length > 0 || params.q !== "" || params.sort !== "newest";

  return (
    <form
      ref={formRef}
      method="get"
      action="/products"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submitClean(event.currentTarget);
      }}
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (
          (target instanceof HTMLInputElement && target.type === "checkbox") ||
          target instanceof HTMLSelectElement
        ) {
          formRef.current?.requestSubmit();
        }
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="catalogue-q">{t("catalogue.filters.search")}</Label>
          <Input
            id="catalogue-q"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder={t("catalogue.filters.searchPlaceholder")}
            enterKeyHint="search"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="catalogue-sort">{t("catalogue.filters.sort")}</Label>
          <select
            id="catalogue-sort"
            name="sort"
            defaultValue={params.sort}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
          >
            <option value="newest">{t("catalogue.filters.sortNewest")}</option>
            <option value="featured">{t("catalogue.filters.sortFeatured")}</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          {t("catalogue.filters.apply")}
        </Button>
      </div>

      {groups.some((group) => group.terms.length > 0) ? (
        <details open={active.length > 0} className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium select-none">
            {t("catalogue.filters.title")}
          </summary>
          <div className="grid gap-6 border-t px-4 py-4 sm:grid-cols-3">
            {groups
              .filter((group) => group.terms.length > 0)
              .map((group) => (
                <fieldset key={group.key} className="min-w-0">
                  <legend className="mb-2 text-sm font-medium">{group.label}</legend>
                  <ul className="space-y-1.5">
                    {group.terms.map((term) => {
                      const id = `filter-${group.key}-${term.slug}`;
                      return (
                        <li key={term.slug} className="flex items-center gap-2">
                          <input
                            id={id}
                            type="checkbox"
                            name={group.key}
                            value={term.slug}
                            defaultChecked={params[group.key].includes(term.slug)}
                            className="accent-primary size-4 rounded"
                          />
                          <label htmlFor={id} className="text-sm">
                            {localised(locale, term.name, term.nameBn)}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              ))}
          </div>
        </details>
      ) : null}

      {hasAnything ? (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label={t("catalogue.filters.active")}
        >
          {active.map((chip) => (
            <Link
              key={`${chip.key}-${chip.slug}`}
              href={catalogueHref(params, {
                page: 1,
                [chip.key]: params[chip.key].filter((slug) => slug !== chip.slug),
              })}
              aria-label={t("catalogue.filters.remove", { name: chip.name })}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              {chip.name} ×
            </Link>
          ))}
          <Link href="/products" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("catalogue.filters.clear")}
          </Link>
        </div>
      ) : null}
    </form>
  );
}
