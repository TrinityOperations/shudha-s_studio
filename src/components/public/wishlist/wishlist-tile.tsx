"use client";
import { XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPriceFrom } from "@/components/public/catalogue/format-price";
import { localised } from "@/components/public/catalogue/localised";
import { Button } from "@/components/ui/button";
import type { CatalogueCard } from "@/db/queries/catalogue";
import { useLocale, useT } from "@/lib/i18n/client";
import { productImageUrl } from "@/lib/storage";

type Props = {
  product: CatalogueCard;
  /** Absent on a shared (read-only) list */
  onRemove?: () => void;
};

/** A saved product: the catalogue card's content, rendered from client state, plus Remove. */
export function WishlistTile({ product, onRemove }: Props) {
  const t = useT();
  const locale = useLocale();
  const title = localised(locale, product.title, product.titleBn);
  const price = formatPriceFrom(product.priceFrom, locale, t);

  return (
    <article className="relative flex gap-4 rounded-lg border p-3" data-testid="wishlist-tile">
      <Link
        href={`/products/${product.slug}`}
        className="bg-muted block size-24 shrink-0 overflow-hidden rounded-md"
        tabIndex={-1}
        aria-hidden
      >
        {product.thumb ? (
          <Image
            src={productImageUrl(product.thumb.thumbPath)}
            alt=""
            width={200}
            height={200}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-foreground/70 flex size-full items-center justify-center text-xs">
            {t("catalogue.noImage")}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="leading-snug font-medium">
          <Link href={`/products/${product.slug}`} className="hover:underline">
            {title}
          </Link>
        </h2>
        {product.category ? (
          <p className="text-muted-foreground text-xs">
            {localised(locale, product.category.name, product.category.nameBn)}
          </p>
        ) : null}
        {price ? <p className="text-sm font-medium">{price}</p> : null}
      </div>
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={t("wishlist.remove", { title })}
          className="shrink-0"
        >
          <XIcon aria-hidden />
        </Button>
      ) : null}
    </article>
  );
}
