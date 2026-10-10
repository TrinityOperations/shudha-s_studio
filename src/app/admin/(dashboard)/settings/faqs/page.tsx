import type { Metadata } from "next";
import { FaqsManager } from "@/components/admin/content/faqs-manager";
import { listAllFaqs } from "@/db/queries/faqs";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.faqs.title") };
}

export default async function FaqsPage() {
  await requireOwner();
  const [t, faqs] = await Promise.all([getT(), listAllFaqs()]);
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.faqs.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.faqs.description")}</p>
      </header>
      <FaqsManager faqs={faqs} />
    </section>
  );
}
