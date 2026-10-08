"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelBooking,
  confirmBooking,
  markDone,
  rescheduleBooking,
} from "@/actions/admin-bookings";
import { SlotPicker, type SlotDayOption } from "@/components/public/booking/slot-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { BookingStatus } from "@/db/schema";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";

type Props = {
  bookingId: string;
  status: BookingStatus;
  /** ISO */
  startsAt: string;
  isPast: boolean;
  days: SlotDayOption[];
};

/** OD-22: confirm, mark done, cancel (with dialog) and reschedule with the #4 slot picker. */
export function BookingActions({ bookingId, status, startsAt, isPast, days }: Props) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [slotStart, setSlotStart] = useState(startsAt);
  const [error, setError] = useState<MessageKey | null>(null);

  const open = status === "new" || status === "confirmed";

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: MessageKey }>,
    successKey: MessageKey,
  ) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        toast.error(t(result.error));
        return;
      }
      toast.success(t(successKey));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {status === "new" ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => confirmBooking(bookingId), "admin.bookings.actions.confirmed")}
          >
            {t("admin.bookings.actions.confirm")}
          </Button>
        ) : null}
        {open && isPast ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => markDone(bookingId), "admin.bookings.actions.markedDone")}
          >
            {t("admin.bookings.actions.done")}
          </Button>
        ) : null}
        {open ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => setCancelOpen(true)}
          >
            {t("admin.bookings.actions.cancel")}
          </Button>
        ) : null}
      </div>

      {open && !isPast ? (
        <section className="space-y-3" aria-labelledby="reschedule-heading">
          <h3 id="reschedule-heading" className="font-medium">
            {t("admin.bookings.actions.reschedule")}
          </h3>
          <SlotPicker days={days} value={slotStart} onChange={setSlotStart} />
          <p className="text-muted-foreground text-xs">{t("booking.timezoneNote")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !slotStart || slotStart === startsAt}
            onClick={() =>
              run(async () => {
                const result = await rescheduleBooking(bookingId, slotStart);
                if (
                  !result.ok &&
                  (result.error === "errors.slotTaken" || result.error === "errors.slotUnavailable")
                ) {
                  setSlotStart(startsAt);
                  router.refresh();
                }
                return result;
              }, "admin.bookings.actions.rescheduled")
            }
          >
            {pending ? t("common.working") : t("admin.bookings.actions.rescheduleButton")}
          </Button>
        </section>
      ) : null}

      {error ? <FieldError>{t(error)}</FieldError> : null}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("admin.bookings.actions.cancelTitle")}
        description={t("admin.bookings.actions.cancelDescription")}
        confirmLabel={t("admin.bookings.actions.cancel")}
        destructive
        pending={pending}
        onConfirm={() => {
          setCancelOpen(false);
          run(() => cancelBooking(bookingId), "admin.bookings.actions.cancelled");
        }}
      />
    </div>
  );
}
