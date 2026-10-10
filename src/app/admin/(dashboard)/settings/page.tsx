import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/admin/settings-form";
import { buttonVariants } from "@/components/ui/button";
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <p className="text-sm">{t("admin.editor.entryHint")}</p>
        <Link href="/admin/home-editor" prefetch={false} className={buttonVariants()}>
          {t("admin.editor.entry")}
        </Link>
      </div>
      <SettingsForm defaultValues={settings} />
    </section>
  );
}
