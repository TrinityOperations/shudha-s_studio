import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/public/catalogue/product-detail";
import { listRelatedProducts } from "@/db/queries/catalogue";
import { getProductDetailForPreview } from "@/db/queries/products";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { productIdSchema } from "@/lib/validators/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.products.preview"), robots: { index: false, follow: false } };
}

/** OD-16: the public product page for any status. Never counts a view. */
export default async function ProductPreviewPage({
  params,
}: PageProps<"/admin/products/[id]/preview">) {
  await requireOwner();
  const { id } = await params;
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const product = await getProductDetailForPreview(parsedId.data);
  if (!product) notFound();

  const related = await listRelatedProducts({
    productId: product.id,
    categoryId: product.categoryId,
    occasionSlugs: product.occasions.map((occasion) => occasion.slug),
  });

  return <ProductDetail product={product} related={related} preview />;
}
