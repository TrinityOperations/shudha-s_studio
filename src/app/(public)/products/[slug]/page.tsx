import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/public/catalogue/product-gallery";
import { ProductCard } from "@/components/public/catalogue/product-card";
import { ShareButtons } from "@/components/public/catalogue/share-buttons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getPublishedProduct,
  incrementProductView,
  listRelatedProducts,
} from "@/db/queries/catalogue";
import { getLocale, getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { productImageUrl } from "@/lib/storage";
import { publicEnv } from "@/lib/env.public";

function excerpt(value: string, length = 160) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length - 1).trimEnd()}…` : compact;
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return {};
  const locale = await getLocale();
  const title = locale === "bn" && product.titleBn ? product.titleBn : product.title;
  const descriptionValue =
    locale === "bn" && product.descriptionBn ? product.descriptionBn : product.description;
  const description = excerpt(descriptionValue || title);
  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      url: `/products/${product.slug}`,
      title,
      description,
      images: image
        ? [
            {
              url: productImageUrl(image.path),
              width: image.width,
              height: image.height,
              alt: locale === "bn" && image.altBn ? image.altBn : image.alt,
            },
          ]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [productImageUrl(image.path)] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) notFound();

  after(() => incrementProductView(product.id));

  const [related, locale, t] = await Promise.all([
    listRelatedProducts(product),
    getLocale(),
    getT(),
  ]);
  const title = locale === "bn" && product.titleBn ? product.titleBn : product.title;
  const description =
    locale === "bn" && product.descriptionBn ? product.descriptionBn : product.description;
  const materialNotes =
    locale === "bn" && product.materialNotesBn ? product.materialNotesBn : product.materialNotes;
  const personalisationNotes =
    locale === "bn" && product.personalisation.notesBn
      ? product.personalisation.notesBn
      : product.personalisation.notes;
  const taxonomyLabel = (item: { name: string; nameBn: string | null }) =>
    locale === "bn" && item.nameBn ? item.nameBn : item.name;
  const shareUrl = new URL(`/products/${product.slug}`, publicEnv.siteUrl).toString();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 px-4 py-8 sm:py-12">
      <nav aria-label={t("catalogue.breadcrumbLabel")} className="text-muted-foreground text-sm">
        <Link href="/products" className="underline-offset-4 hover:underline">
          {t("catalogue.backToProducts")}
        </Link>
      </nav>

      <article className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} productTitle={title} />

        <div className="space-y-7">
          <header className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {product.category ? (
                <Badge variant="secondary">{taxonomyLabel(product.category)}</Badge>
              ) : null}
              {product.occasions.map((occasion) => (
                <Badge key={occasion.slug} variant="outline">
                  {taxonomyLabel(occasion)}
                </Badge>
              ))}
              {product.tags.map((tag) => (
                <Badge key={tag.slug} variant="outline">
                  {taxonomyLabel(tag)}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            {description ? (
              <p className="text-muted-foreground whitespace-pre-line">{description}</p>
            ) : null}
          </header>

          {materialNotes ? (
            <section aria-labelledby="material-heading" className="space-y-2">
              <h2 id="material-heading" className="text-lg font-semibold">
                {t("catalogue.materialNotes")}
              </h2>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{materialNotes}</p>
            </section>
          ) : null}

          {product.personalisation.options.length || personalisationNotes ? (
            <section aria-labelledby="personalisation-heading" className="space-y-3">
              <h2 id="personalisation-heading" className="text-lg font-semibold">
                {t("catalogue.personalisation")}
              </h2>
              {product.personalisation.options.length ? (
                <ul className="flex flex-wrap gap-2">
                  {product.personalisation.options.map((option) => (
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
            <p className="bg-muted rounded-lg px-4 py-3 text-sm">
              <span className="font-medium">{t("catalogue.turnaround")}: </span>
              {t("catalogue.turnaroundDays", { count: product.turnaroundDays })}
            </p>
          ) : null}

          <div className="space-y-3 border-t pt-6">
            <p className="text-muted-foreground text-sm">{t("catalogue.quoteNote")}</p>
            <Link
              href={`/book?product=${encodeURIComponent(product.slug)}`}
              className={buttonVariants({ size: "lg" })}
            >
              {t("common.bookAppointment")}
            </Link>
          </div>

          <ShareButtons title={title} url={shareUrl} />
        </div>
      </article>

      {related.length ? (
        <section aria-labelledby="related-heading" className="space-y-5">
          <h2 id="related-heading" className="text-2xl font-semibold tracking-tight">
            {t("catalogue.relatedProducts")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} locale={locale} t={t} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
