import Image from "next/image";
import Link from "next/link";
import { WishlistButton } from "@/components/public/wishlist/wishlist-button";
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

/**
 * Catalogue card (PW-10, PW-14), restyled in slice #9 (docs/design.md, "Product card"): 4:5 photo
 * on white with a line border, the second photo on hover, Eczar title, a quiet price tag.
 * Reused by related products, the home page and the wishlist.
 */
export async function ProductCard({ product, priority = false }: Props) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const title = localised(locale, product.title, product.titleBn);
  const price = formatPriceFrom(product.priceFrom, locale, t);
  const sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

  return (
    <article className="group relative flex flex-col gap-2">
      <div className="border-line relative aspect-[4/5] overflow-hidden border bg-white">
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton slug={product.slug} title={title} />
        </div>
        {product.thumb ? (
          <Image
            src={productImageUrl(product.thumb.thumbPath)}
            alt={localised(locale, product.thumb.alt, product.thumb.altBn)}
            width={400}
            height={500}
            sizes={sizes}
            priority={priority}
            className={`size-full object-cover transition-opacity duration-300 ${
              product.hoverThumb ? "group-hover:opacity-0" : ""
            }`}
          />
        ) : (
          <div className="bg-mist text-muted-foreground flex size-full items-center justify-center text-sm">
            {t("catalogue.noImage")}
          </div>
        )}
        {product.hoverThumb ? (
          <Image
            src={productImageUrl(product.hoverThumb.thumbPath)}
            alt=""
            width={400}
            height={500}
            sizes={sizes}
            aria-hidden
            className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        ) : null}
      </div>
      {product.category ? (
        <p className="text-muted-foreground text-[13px]">
          {localised(locale, product.category.name, product.category.nameBn)}
        </p>
      ) : null}
      <h3 className="font-heading text-ink text-[20px] leading-snug">
        <Link
          href={`/products/${product.slug}`}
          className="focus-visible:after:outline-primary after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-3"
        >
          {title}
        </Link>
      </h3>
      {price ? <span className="tag tag-quiet w-fit">{price}</span> : null}
    </article>
  );
}
