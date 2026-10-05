import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getGeneralSettings } from "@/db/queries/settings";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.settings.title") };
}

export default async function SettingsPage() {
  await requireOwner();
  const [t, settings] = await Promise.all([getT(), getGeneralSettings()]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.settings.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.settings.description")}</p>
      </header>
      <SettingsForm defaultValues={settings} />
    </section>
  );
}
