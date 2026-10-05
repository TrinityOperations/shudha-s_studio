import type { Metadata } from "next";
import { AvailabilityForm } from "@/components/admin/availability/availability-form";
import { BlockedPeriods } from "@/components/admin/availability/blocked-periods";
import { getAvailabilitySettings, listBlockedPeriods } from "@/db/queries/availability";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("availability.title") };
}

export default async function AvailabilityPage() {
  await requireOwner();
  const [t, settings, periods] = await Promise.all([
    getT(),
    getAvailabilitySettings(),
    listBlockedPeriods(),
  ]);
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("availability.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("availability.description")}</p>
      </header>
      <AvailabilityForm defaultValues={settings} />
      <BlockedPeriods periods={periods} />
    </div>
  );
}
