import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CatalogueCardProduct } from "@/db/queries/catalogue";
import type { Locale } from "@/lib/i18n";
import type { T } from "@/lib/i18n/t";
import { productImageUrl } from "@/lib/storage";

export function ProductCard({
  product,
  locale,
  t,
  priority = false,
}: {
  product: CatalogueCardProduct;
  locale: Locale;
  t: T;
  priority?: boolean;
}) {
  const title = locale === "bn" && product.titleBn ? product.titleBn : product.title;
  const category = product.category
    ? locale === "bn" && product.category.nameBn
      ? product.category.nameBn
      : product.category.name
    : null;
  const alt = product.image
    ? locale === "bn" && product.image.altBn
      ? product.image.altBn
      : product.image.alt
    : "";

  return (
    <article className="group bg-card text-card-foreground focus-within:ring-ring/50 overflow-hidden rounded-xl border shadow-sm transition-shadow focus-within:ring-3 hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="block outline-none">
        <div className="bg-muted relative aspect-[4/3] overflow-hidden">
          {product.image ? (
            <Image
              src={productImageUrl(product.image.thumbPath)}
              alt={alt}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <ImageIcon aria-hidden="true" className="size-10" />
              <span className="sr-only">{t("catalogue.imageUnavailable")}</span>
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {product.featured ? <Badge variant="secondary">{t("catalogue.featured")}</Badge> : null}
          </div>
          {category ? <p className="text-muted-foreground text-sm">{category}</p> : null}
          <span className="text-primary inline-flex text-sm font-medium underline-offset-4 group-hover:underline">
            {t("catalogue.viewProduct")}
          </span>
        </div>
      </Link>
    </article>
  );
}
