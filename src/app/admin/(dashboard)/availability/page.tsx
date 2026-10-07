import type { Metadata } from "next";
import { BlockedPeriods } from "@/components/admin/availability/blocked-periods";
import { BookingSettingsForm } from "@/components/admin/availability/booking-settings-form";
import { WeeklyHoursForm } from "@/components/admin/availability/weekly-hours-form";
import {
  getBookingSettings,
  listAvailabilityRules,
  listBlockedPeriods,
} from "@/db/queries/availability";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatMelbourne } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.availability.title") };
}

/** OD-21: weekly hours, booking settings and blocked periods. */
export default async function AvailabilityPage() {
  await requireOwner();
  const [t, settings, rules, blocked] = await Promise.all([
    getT(),
    getBookingSettings(),
    listAvailabilityRules(),
    listBlockedPeriods(),
  ]);

  // One row per weekday; a weekday with no rule shows closed with the default hours.
  const days = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const rule = rules.find((r) => r.weekday === weekday);
    return rule
      ? { weekday, active: rule.active, startTime: rule.startTime, endTime: rule.endTime }
      : { weekday, active: false, startTime: "10:00", endTime: "18:00" };
  });

  return (
    <div className="space-y-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.availability.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.availability.description")}</p>
      </header>

      <section className="space-y-4" aria-labelledby="hours-heading">
        <h2 id="hours-heading" className="text-xl font-semibold tracking-tight">
          {t("admin.availability.hours.title")}
        </h2>
        <WeeklyHoursForm defaultValues={{ days }} />
      </section>

      <section className="space-y-4" aria-labelledby="settings-heading">
        <h2 id="settings-heading" className="text-xl font-semibold tracking-tight">
          {t("admin.availability.settings.title")}
        </h2>
        <BookingSettingsForm defaultValues={settings} />
      </section>

      <section className="space-y-4" aria-labelledby="blocked-heading">
        <h2 id="blocked-heading" className="text-xl font-semibold tracking-tight">
          {t("admin.availability.blocked.title")}
        </h2>
        <BlockedPeriods
          items={blocked.map((b) => ({
            id: b.id,
            startsLabel: formatMelbourne(b.startsAt),
            endsLabel: formatMelbourne(b.endsAt),
            reason: b.reason,
          }))}
        />
      </section>
    </div>
  );
}
