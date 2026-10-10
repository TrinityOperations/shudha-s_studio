import type { Metadata } from "next";
import { AnnouncementForm } from "@/components/admin/content/announcement-form";
import { getAnnouncementSettings } from "@/db/queries/settings";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.announcement.title") };
}

export default async function AnnouncementPage() {
  await requireOwner();
  const [t, announcement] = await Promise.all([getT(), getAnnouncementSettings()]);
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.announcement.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.announcement.description")}</p>
      </header>
      <AnnouncementForm defaultValues={announcement} />
    </section>
  );
}
