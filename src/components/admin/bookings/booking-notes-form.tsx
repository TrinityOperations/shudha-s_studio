"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveBookingNotes } from "@/actions/admin-bookings";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";

/** OD-23: private notes, owner-only. */
export function BookingNotesForm({ bookingId, notes }: { bookingId: string; notes: string }) {
  const t = useT();
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(notes);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setError(null);
          const result = await saveBookingNotes(bookingId, value);
          if (!result.ok) {
            setError((result.fieldErrors?.notes?.[0] as MessageKey | undefined) ?? result.error);
            return;
          }
          setSaved(result.data.notes);
          setValue(result.data.notes);
          toast.success(t("admin.bookings.notes.saved"));
        });
      }}
    >
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor="booking-notes">{t("admin.bookings.notes.label")}</FieldLabel>
        <Textarea
          id="booking-notes"
          rows={4}
          maxLength={2000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby="booking-notes-hint"
        />
        <FieldDescription id="booking-notes-hint">
          {t("admin.bookings.notes.hint")}
        </FieldDescription>
        {error ? <FieldError>{t(error)}</FieldError> : null}
      </Field>
      <Button
        type="submit"
        variant="outline"
        disabled={pending || value === saved}
        aria-busy={pending}
      >
        {pending ? t("common.saving") : t("admin.bookings.notes.save")}
      </Button>
    </form>
  );
}
