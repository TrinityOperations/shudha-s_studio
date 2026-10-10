import type { Metadata } from "next";
import { BannerForm } from "@/components/admin/content/banner-form";
import { getSeasonalBannerSettings } from "@/db/queries/settings";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.banner.title") };
}

export default async function BannerPage() {
  await requireOwner();
  const [t, banner] = await Promise.all([getT(), getSeasonalBannerSettings()]);
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.banner.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.banner.description")}</p>
      </header>
      <BannerForm defaultValues={banner} />
    </section>
  );
}
