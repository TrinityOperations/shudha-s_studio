import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BookingActions } from "@/components/admin/bookings/booking-actions";
import { BookingNotesForm } from "@/components/admin/bookings/booking-notes-form";
import { BriefSection, SIGNED_URL_SECONDS } from "@/components/admin/bookings/brief-section";
import { ReplyLinks } from "@/components/admin/bookings/reply-links";
import { StatusBadge } from "@/components/admin/bookings/status-badge";
import { WishlistSection } from "@/components/admin/bookings/wishlist-section";
import type { SlotDayOption } from "@/components/public/booking/slot-picker";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getAdminBookingDetail,
  isBusinessBrief,
  listRescheduleSlots,
  type BriefWithOrderFor,
} from "@/db/queries/bookings";
import { getGeneralSettings } from "@/db/queries/settings";
import { BOOKING_UPLOADS_BUCKET } from "@/lib/booking/defaults";
import { groupSlotsByMelbourneDate } from "@/lib/booking/slots";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/t";
import { createSignedStorageUrl } from "@/lib/storage.server";
import { formatMelbourne } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.bookings.detail.title") };
}

const idSchema = z.uuid();

/** OD-23, OD-24, OD-26: one booking, owner only. Signed URLs are made here and never stored. */
export default async function BookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  await requireOwner();
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) notFound();

  const detail = await getAdminBookingDetail(parsed.data);
  if (!detail) notFound();
  const { booking, product, wishlist } = detail;
  const now = new Date();
  const isPast = booking.startsAt <= now;

  const [t, general, slots, referenceUrl] = await Promise.all([
    getT(),
    getGeneralSettings(),
    booking.status === "new" || booking.status === "confirmed"
      ? listRescheduleSlots(booking, now, { ignoreMinNotice: true })
      : Promise.resolve([]),
    booking.referenceImagePath
      ? createSignedStorageUrl(
          BOOKING_UPLOADS_BUCKET,
          booking.referenceImagePath,
          SIGNED_URL_SECONDS,
        )
      : Promise.resolve(null),
  ]);

  const days: SlotDayOption[] = groupSlotsByMelbourneDate(slots).map((day) => ({
    date: day.date,
    label: formatMelbourne(day.slots[0].startsAt, "EEE d MMM"),
    slots: day.slots.map((slot) => ({
      start: slot.startsAt.toISOString(),
      label: formatMelbourne(slot.startsAt, "h:mm aaa"),
    })),
  }));

  const brief = (booking.brief ?? null) as BriefWithOrderFor | null;
  const business = isBusinessBrief(brief)
    ? brief.businessName || t("admin.bookings.brief.business")
    : null;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <Link href="/admin/bookings" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ← {t("admin.bookings.detail.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{booking.customerName}</h1>
          <StatusBadge status={booking.status} t={t} />
          {business ? <Badge variant="outline">{business}</Badge> : null}
        </div>
        <p className="text-lg">{formatMelbourne(booking.startsAt, "EEEE d MMMM yyyy, h:mm aaa")}</p>
        <ReplyLinks
          customerName={booking.customerName}
          customerPhone={booking.customerPhone}
          customerEmail={booking.customerEmail}
          startsAt={booking.startsAt}
          locale={booking.locale}
          studioName={general.studioName}
        />
      </header>

      <section className="space-y-3" aria-labelledby="customer-heading">
        <h2 id="customer-heading" className="text-lg font-semibold">
          {t("admin.bookings.detail.customer")}
        </h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm">{t("admin.bookings.detail.whatsapp")}</dt>
            <dd>+{booking.customerPhone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">{t("admin.bookings.detail.email")}</dt>
            <dd>
              <a
                href={`mailto:${booking.customerEmail}`}
                className="underline-offset-4 hover:underline"
              >
                {booking.customerEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">{t("booking.confirmation.type")}</dt>
            <dd>{t(`booking.type.${booking.consultationType}` as MessageKey)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">{t("admin.bookings.detail.product")}</dt>
            <dd>
              {product ? (
                <Link
                  href={`/admin/products/${product.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {product.title}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {t("admin.bookings.detail.noProduct")}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">{t("admin.bookings.detail.locale")}</dt>
            <dd>{booking.locale === "bn" ? t("common.bengali") : t("common.english")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">{t("admin.bookings.detail.created")}</dt>
            <dd>{formatMelbourne(booking.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm">{t("admin.bookings.detail.message")}</dt>
            <dd className="whitespace-pre-line">
              {booking.message || (
                <span className="text-muted-foreground">
                  {t("admin.bookings.detail.noMessage")}
                </span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm">
              {t("admin.bookings.detail.referenceImage")}
            </dt>
            <dd>
              {referenceUrl ? (
                <div className="space-y-1">
                  <a href={referenceUrl} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={referenceUrl}
                      alt=""
                      width={240}
                      height={240}
                      unoptimized
                      className="max-h-60 w-auto rounded-md"
                    />
                  </a>
                  <p className="text-muted-foreground text-xs">
                    {t("admin.bookings.detail.imageExpires")}
                  </p>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {t("admin.bookings.detail.noReferenceImage")}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <BriefSection brief={brief} />
      <WishlistSection products={wishlist} />

      <section className="space-y-3" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="text-lg font-semibold">
          {t("admin.bookings.notes.label")}
        </h2>
        <BookingNotesForm bookingId={booking.id} notes={booking.privateNotes ?? ""} />
      </section>

      <section className="space-y-3" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-lg font-semibold">
          {t("common.actions")}
        </h2>
        <BookingActions
          bookingId={booking.id}
          status={booking.status}
          startsAt={booking.startsAt.toISOString()}
          isPast={isPast}
          days={days}
        />
      </section>
    </div>
  );
}
