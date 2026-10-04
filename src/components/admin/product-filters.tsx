"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useT } from "@/lib/i18n/client";

const ALL = "all";

type Props = {
  categories: { id: string; name: string; nameBn: string | null }[];
  status: string;
  categoryId: string;
  q: string;
};

/** Filters live in the URL so the list is shareable and the server does the filtering. */
export function ProductFilters({ categories, status, categoryId, q }: Props) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  const statusItems = [
    { value: ALL, label: t("common.all") },
    { value: "draft", label: t("status.draft") },
    { value: "published", label: t("status.published") },
    { value: "archived", label: t("status.archived") },
  ];
  const categoryItems = [
    { value: ALL, label: t("common.all") },
    ...categories.map((c) => ({
      value: c.id,
      label: locale === "bn" && c.nameBn ? c.nameBn : c.name,
    })),
  ];
  const hasFilters = Boolean(status || categoryId || q);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-status">{t("admin.products.filter.status")}</Label>
        <Select
          items={statusItems}
          value={status || ALL}
          onValueChange={(value) => update({ status: value ?? ALL })}
        >
          <SelectTrigger id="filter-status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-category">{t("admin.products.filter.category")}</Label>
        <Select
          items={categoryItems}
          value={categoryId || ALL}
          onValueChange={(value) => update({ category: value ?? ALL })}
        >
          <SelectTrigger id="filter-category" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="filter-q">{t("admin.products.filter.search")}</Label>
        <Input
          id="filter-q"
          type="search"
          value={search}
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => update({ q: value.trim() }), 300);
          }}
        />
      </div>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSearch("");
            router.replace(pathname);
          }}
        >
          {t("common.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
