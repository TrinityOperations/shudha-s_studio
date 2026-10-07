import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { localised } from "@/components/public/catalogue/localised";
import { ProductDetail } from "@/components/public/catalogue/product-detail";
import { getPublishedProduct, listRelatedProducts } from "@/db/queries/catalogue";
import { recordProductView } from "@/lib/catalogue/record-view";
import { getLocale } from "@/lib/i18n";
import { productImageUrl } from "@/lib/storage";

// Shared between generateMetadata and the page within one request.
const getProduct = cache(getPublishedProduct);

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const locale = await getLocale();
  const title = localised(locale, product.title, product.titleBn);
  const description = localised(locale, product.description, product.descriptionBn)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const image = product.images[0];
  const path = `/products/${product.slug}`;
  return {
    title,
    description: description || undefined,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: description || undefined,
      url: path,
      type: "website",
      images: image
        ? [
            {
              url: productImageUrl(image.path),
              width: image.width,
              height: image.height,
              alt: image.alt,
            },
          ]
        : [],
    },
  };
}

/** PW-20..27, PW-48. Drafts and archived products 404 here; the owner previews them under /admin. */
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const userAgent = (await headers()).get("user-agent");
  after(async () => {
    try {
      await recordProductView(product.id, userAgent);
    } catch (error) {
      console.error("[catalogue] product view not recorded", error);
    }
  });

  const related = await listRelatedProducts({
    productId: product.id,
    categoryId: product.categoryId,
    occasionSlugs: product.occasions.map((occasion) => occasion.slug),
  });

  return <ProductDetail product={product} related={related} />;
}
