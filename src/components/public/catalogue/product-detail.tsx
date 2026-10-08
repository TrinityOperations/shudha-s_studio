import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { CatalogueCard, ProductDetail as ProductDetailModel } from "@/db/queries/catalogue";
import { publicEnv } from "@/lib/env.public";
import { getLocale, getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { productImageUrl } from "@/lib/storage";
import { PERSONALISATION_OPTIONS, type PersonalisationOption } from "@/lib/validators/products";
import { catalogueHref, defaultCatalogueParams } from "@/lib/validators/catalogue";
import { formatPriceFrom } from "./format-price";
import { localised } from "./localised";
import { ProductCard } from "./product-card";
import { ProductGallery } from "./product-gallery";
import { ProductVideo } from "./product-video";
import { ShareButtons } from "./share-buttons";

type Props = {
  product: ProductDetailModel;
  related: CatalogueCard[];
  /** Admin preview (OD-16): shows the banner; the page itself decides not to count views. */
  preview?: boolean;
};

/** PW-21..27, PW-48: the whole product page body, shared by the public route and the admin preview. */
export async function ProductDetail({ product, related, preview = false }: Props) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const title = localised(locale, product.title, product.titleBn);
  const description = localised(locale, product.description, product.descriptionBn);
  const materialNotes = localised(locale, product.materialNotes ?? "", product.materialNotesBn);
  const personalisationNotes = localised(
    locale,
    product.personalisation.notes,
    product.personalisation.notesBn,
  );
  const known = new Set<string>(PERSONALISATION_OPTIONS);
  const options = product.personalisation.options.filter((o): o is PersonalisationOption =>
    known.has(o),
  );
  const price = formatPriceFrom(product.priceFrom, locale, t);
  const url = `${publicEnv.siteUrl}/products/${product.slug}`;
  const images = product.images.map((image) => ({
    src: productImageUrl(image.path),
    thumbSrc: productImageUrl(image.thumbPath),
    alt: localised(locale, image.alt, image.altBn),
    width: image.width,
    height: image.height,
  }));

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-12">
      {preview ? (
        <div
          role="status"
          className="mb-6 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50"
        >
          {t("catalogue.preview.banner")}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {images.length > 0 ? (
          <ProductGallery images={images} />
        ) : (
          <div className="bg-muted text-foreground/70 flex aspect-square items-center justify-center rounded-xl">
            {t("catalogue.noImage")}
          </div>
        )}

        <div className="space-y-6">
          <header className="space-y-2">
            {product.category ? (
              <Link
                href={catalogueHref(defaultCatalogueParams, { category: [product.category.slug] })}
                className="text-muted-foreground text-sm underline-offset-4 hover:underline"
              >
                {localised(locale, product.category.name, product.category.nameBn)}
              </Link>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {price ? <p className="text-xl font-medium">{price}</p> : null}
          </header>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/book?product=${encodeURIComponent(product.slug)}`}
                prefetch={false}
                className={buttonVariants({ size: "lg" })}
              >
                {t("common.bookAppointment")}
              </Link>
              <Link
                href={`/custom-order?product=${encodeURIComponent(product.slug)}`}
                prefetch={false}
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                {t("catalogue.product.customOrder")}
              </Link>
            </div>
            <p className="text-muted-foreground text-sm">{t("catalogue.product.deliveryNote")}</p>
          </div>

          {description ? <p className="whitespace-pre-line">{description}</p> : null}

          {materialNotes ? (
            <section className="space-y-1">
              <h2 className="text-sm font-medium">{t("catalogue.product.materialNotes")}</h2>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{materialNotes}</p>
            </section>
          ) : null}

          {options.length > 0 || personalisationNotes ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">{t("catalogue.product.personalisation")}</h2>
              {options.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <li key={option}>
                      <Badge variant="secondary">
                        {t(`personalisation.${option}` as MessageKey)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              {personalisationNotes ? (
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {personalisationNotes}
                </p>
              ) : null}
            </section>
          ) : null}

          {product.turnaroundDays !== null ? (
            <p className="text-sm">
              {product.turnaroundDays === 1
                ? t("catalogue.product.turnaroundOne")
                : t("catalogue.product.turnaround", { days: product.turnaroundDays })}
            </p>
          ) : null}

          {product.occasions.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">{t("catalogue.product.occasions")}</h2>
              <ul className="flex flex-wrap gap-2">
                {product.occasions.map((occasion) => (
                  <li key={occasion.slug}>
                    <Link
                      href={catalogueHref(defaultCatalogueParams, { occasion: [occasion.slug] })}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {localised(locale, occasion.name, occasion.nameBn)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.tags.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium">{t("catalogue.product.tags")}</h2>
              <ul className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <li key={tag.slug}>
                    <Link
                      href={catalogueHref(defaultCatalogueParams, { tag: [tag.slug] })}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      #{localised(locale, tag.name, tag.nameBn)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ShareButtons url={url} title={title} />
        </div>
      </div>

      {product.videoUrl ? (
        <section className="mt-12 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("catalogue.product.videoTitle")}
          </h2>
          <ProductVideo url={product.videoUrl} title={title} />
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">{t("catalogue.product.related")}</h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((card) => (
              <li key={card.id}>
                <ProductCard product={card} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
