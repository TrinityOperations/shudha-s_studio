import Image from "next/image";
import Link from "next/link";
import type { CatalogueCard } from "@/db/queries/catalogue";
import { getLocale, getT } from "@/lib/i18n";
import { productImageUrl } from "@/lib/storage";
import { formatPriceFrom } from "./format-price";
import { localised } from "./localised";

type Props = {
  product: CatalogueCard;
  /** First row of a grid: eager-load for LCP. Everything else lazy-loads (PW-15). */
  priority?: boolean;
};

/** Catalogue grid card (PW-10, PW-14). Reused by related products and later slices (#7, #8, #9). */
export async function ProductCard({ product, priority = false }: Props) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const title = localised(locale, product.title, product.titleBn);
  const price = formatPriceFrom(product.priceFrom, locale, t);

  return (
    <article className="group relative flex flex-col gap-2">
      <div className="bg-muted aspect-square overflow-hidden rounded-lg">
        {product.thumb ? (
          <Image
            src={productImageUrl(product.thumb.thumbPath)}
            alt={localised(locale, product.thumb.alt, product.thumb.altBn)}
            width={400}
            height={400}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-foreground/70 flex size-full items-center justify-center text-sm">
            {t("catalogue.noImage")}
          </div>
        )}
      </div>
      <h3 className="leading-snug font-medium">
        <Link
          href={`/products/${product.slug}`}
          className="focus-visible:after:ring-ring/50 after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-3"
        >
          {title}
        </Link>
      </h3>
      {product.category ? (
        <p className="text-muted-foreground text-xs">
          {localised(locale, product.category.name, product.category.nameBn)}
        </p>
      ) : null}
      {price ? <p className="text-sm font-medium">{price}</p> : null}
    </article>
  );
}
