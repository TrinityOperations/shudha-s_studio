import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/bookings/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { countNewBookings, listUpcomingBookings } from "@/db/queries/bookings";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatMelbourne } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.dashboard.title") };
}

export default async function AdminHomePage() {
  const owner = await requireOwner();
  const [t, newCount, upcoming] = await Promise.all([
    getT(),
    countNewBookings(),
    listUpcomingBookings(5),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.dashboard.title")}</h1>
      <p className="text-muted-foreground text-sm">
        {t("admin.dashboard.signedInAs", { email: owner.email ?? "" })}
      </p>
      <p className="max-w-prose">{t("admin.dashboard.intro")}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/home-editor" prefetch={false} className={buttonVariants()}>
          {t("admin.editor.entry")}
        </Link>
        <Link href="/admin/settings" className={buttonVariants({ variant: "outline" })}>
          {t("common.settings")}
        </Link>
      </div>

      <section className="space-y-3 rounded-lg border p-4" aria-labelledby="next-bookings-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="next-bookings-heading" className="text-lg font-semibold">
            {t("admin.bookings.dashboard.next")}
          </h2>
          <Link
            href="/admin/bookings"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("admin.bookings.dashboard.all")}
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">
          {newCount === 1
            ? t("admin.bookings.dashboard.newOne")
            : t("admin.bookings.dashboard.new", { count: newCount })}
        </p>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("admin.bookings.dashboard.none")}</p>
        ) : (
          <ul className="divide-y">
            {upcoming.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <Link
                  href={`/admin/bookings/${row.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  <span className="font-medium">
                    {formatMelbourne(row.startsAt, "EEE d MMM, h:mm aaa")}
                  </span>
                  {" · "}
                  {row.customerName}
                </Link>
                <StatusBadge status={row.status} t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
