import type { Metadata } from "next";
import Link from "next/link";
import { TaxonomyList } from "@/components/admin/taxonomy-list";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listTaxonomy } from "@/db/queries/taxonomy";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.taxonomy.title") };
}

export default async function TaxonomyPage() {
  await requireOwner();
  const [t, taxonomy] = await Promise.all([getT(), listTaxonomy()]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.taxonomy.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.taxonomy.description")}</p>
      </header>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">{t("admin.taxonomy.categories")}</TabsTrigger>
          <TabsTrigger value="occasions">{t("admin.taxonomy.occasions")}</TabsTrigger>
          <TabsTrigger value="tags">{t("admin.taxonomy.tags")}</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="pt-4">
          <TaxonomyList kind="category" items={taxonomy.categories} />
        </TabsContent>
        <TabsContent value="occasions" className="pt-4">
          <TaxonomyList kind="occasion" items={taxonomy.occasions} />
        </TabsContent>
        <TabsContent value="tags" className="pt-4">
          <TaxonomyList kind="tag" items={taxonomy.tags} />
        </TabsContent>
      </Tabs>

      <Link href="/admin/products" className={buttonVariants({ variant: "ghost" })}>
        {t("admin.products.backToList")}
      </Link>
    </section>
  );
}
