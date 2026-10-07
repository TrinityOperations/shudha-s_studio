import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { buttonVariants } from "@/components/ui/button";
import { getProductForEdit } from "@/db/queries/products";
import { listTaxonomy } from "@/db/queries/taxonomy";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { productIdSchema } from "@/lib/validators/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.products.form.editTitle") };
}

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireOwner();
  const { id } = await params;
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [t, product, taxonomy] = await Promise.all([
    getT(),
    getProductForEdit(parsedId.data),
    listTaxonomy(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("admin.products.form.editTitle")}
          </h1>
          <Link
            href={`/admin/products/${product.id}/preview`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("admin.products.preview")}
          </Link>
        </header>
        <ProductForm
          mode="edit"
          productId={product.id}
          status={product.status}
          publishedAt={product.publishedAt}
          defaultValues={product.values}
          taxonomy={taxonomy}
        />
      </section>
      <ProductImages productId={product.id} images={product.images} />
    </div>
  );
}
