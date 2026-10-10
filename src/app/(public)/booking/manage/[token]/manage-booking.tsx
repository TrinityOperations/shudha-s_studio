"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking, rescheduleBooking } from "@/actions/booking-manage";
import { SlotPicker, type SlotDayOption } from "@/components/public/booking/slot-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { BookingSummary } from "@/lib/booking/summary";
import { useLocale, useT } from "@/lib/i18n/client";
import { localised } from "@/lib/i18n/localised";
import type { MessageKey } from "@/lib/i18n/t";

type Props = {
  token: string;
  name: string;
  summary: BookingSummary;
  days: SlotDayOption[];
  whatsappUrl: string | null;
};

type Phase =
  { kind: "idle" } | { kind: "rescheduled"; summary: BookingSummary } | { kind: "cancelled" };

function SummaryList({ summary }: { summary: BookingSummary }) {
  const t = useT();
  const locale = useLocale();
  const product = localised(locale, summary.productTitle ?? "", summary.productTitleBn) || null;
  return (
    <dl className="grid gap-3 sm:grid-cols-2" data-testid="booking-summary">
      <div>
        <dt className="text-muted-foreground text-sm">{t("booking.confirmation.date")}</dt>
        <dd className="font-medium">{summary.date}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-sm">{t("booking.confirmation.time")}</dt>
        <dd className="font-medium">{summary.time}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-sm">{t("booking.confirmation.type")}</dt>
        <dd className="font-medium">
          {t(`booking.type.${summary.consultationType}` as MessageKey)}
        </dd>
      </div>
      {product ? (
        <div>
          <dt className="text-muted-foreground text-sm">{t("booking.confirmation.product")}</dt>
          <dd className="font-medium">{product}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Cancel or move the booking. After either, the token used is dead, so no further actions show. */
export function ManageBooking({ token, name, summary, days, whatsappUrl }: Props) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [slotStart, setSlotStart] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  const whatsapp = whatsappUrl ? (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "outline" })}
    >
      {t("common.messageOnWhatsApp")}
    </a>
  ) : null;

  if (phase.kind === "cancelled") {
    return (
      <section
        aria-live="polite"
        className="bg-muted/30 space-y-4 rounded-xl border p-6"
        data-testid="manage-done"
      >
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookingManage.cancel.done")}</h2>
        <p>{t("bookingManage.cancel.doneIntro")}</p>
        <div className="flex flex-wrap gap-2">
          <a href="/book" className={buttonVariants()}>
            {t("emails.common.bookAgain")}
          </a>
          {whatsapp}
        </div>
      </section>
    );
  }

  if (phase.kind === "rescheduled") {
    return (
      <section
        aria-live="polite"
        className="bg-muted/30 space-y-4 rounded-xl border p-6"
        data-testid="manage-done"
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("bookingManage.reschedule.done")}
        </h2>
        <p>{t("bookingManage.reschedule.doneIntro")}</p>
        <SummaryList summary={phase.summary} />
        <p className="text-muted-foreground text-sm">{t("bookingManage.linkSent")}</p>
        {whatsapp}
      </section>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-xl border p-6">
        <p>{t("booking.confirmation.intro", { name })}</p>
        <SummaryList summary={summary} />
        <div className="flex flex-wrap gap-2">
          {whatsapp}
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => setCancelOpen(true)}
          >
            {t("bookingManage.cancel.button")}
          </Button>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="reschedule-heading">
        <h2 id="reschedule-heading" className="text-xl font-semibold tracking-tight">
          {t("bookingManage.reschedule.title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("bookingManage.reschedule.intro")}</p>
        <SlotPicker days={days} value={slotStart} onChange={setSlotStart} />
        <p className="text-muted-foreground text-xs">{t("booking.timezoneNote")}</p>
        {error ? <FieldError>{t(error)}</FieldError> : null}
        <Button
          type="button"
          disabled={pending || !slotStart}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await rescheduleBooking({ token, slotStart });
              if (!result.ok) {
                setError(result.error);
                if (
                  result.error === "errors.slotTaken" ||
                  result.error === "errors.slotUnavailable"
                ) {
                  setSlotStart("");
                  router.refresh();
                }
                return;
              }
              // No refresh: the token in this URL was just rotated and would now 404.
              setPhase({ kind: "rescheduled", summary: result.data.summary });
            })
          }
        >
          {pending ? t("common.working") : t("bookingManage.reschedule.button")}
        </Button>
      </section>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("bookingManage.cancel.title")}
        description={t("bookingManage.cancel.description")}
        confirmLabel={t("bookingManage.cancel.button")}
        destructive
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            setError(null);
            const result = await cancelBooking(token);
            if (!result.ok) {
              setCancelOpen(false);
              setError(result.error);
              return;
            }
            setCancelOpen(false);
            // No refresh: the token in this URL is dead now.
            setPhase({ kind: "cancelled" });
          })
        }
      />
    </div>
  );
}
