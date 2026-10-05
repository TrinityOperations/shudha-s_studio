import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { listTaxonomy } from "@/db/queries/taxonomy";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { emptyProductInput } from "@/lib/validators/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.products.form.createTitle") };
}

export default async function NewProductPage() {
  await requireOwner();
  const [t, taxonomy] = await Promise.all([getT(), listTaxonomy()]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("admin.products.form.createTitle")}
      </h1>
      <ProductForm mode="create" defaultValues={emptyProductInput} taxonomy={taxonomy} />
    </section>
  );
}
