"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { searchProductPhotos, type ProductPhotoOption } from "@/actions/home-editor";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { productImageUrl } from "@/lib/storage";

type Props = { onPick: (option: ProductPhotoOption) => void; busy: boolean };

/** "From products": search plus a grid of photos from published and draft products. */
export function ProductsTab({ onPick, busy }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ProductPhotoOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      searchProductPhotos(query).then((result) => {
        if (!cancelled) setOptions(result.ok ? result.data : []);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="product-search">{t("admin.editor.panel.search")}</FieldLabel>
        <Input
          id="product-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Field>
      {options === null ? (
        <p className="text-muted-foreground text-sm">{t("common.working")}</p>
      ) : options.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("admin.editor.panel.empty")}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {options.map((option) => (
            <li key={`${option.productId}-${option.path}`}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPick(option)}
                className="focus-visible:outline-primary group block w-full text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                aria-label={`${t("admin.editor.panel.use")}: ${option.title}`}
                data-testid="product-photo-option"
              >
                <span className="bg-mist relative block aspect-square overflow-hidden">
                  <Image
                    src={productImageUrl(option.thumbPath)}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs">
                  <span className="truncate">{option.title}</span>
                  {option.status === "draft" ? (
                    <Badge variant="outline">{t("admin.editor.panel.draft")}</Badge>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
