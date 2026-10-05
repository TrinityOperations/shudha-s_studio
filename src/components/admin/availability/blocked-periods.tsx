"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addBlockedPeriod, deleteBlockedPeriod } from "@/actions/availability";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BlockedPeriod } from "@/db/queries/availability";
import { useT } from "@/lib/i18n/client";
import { formatMelbourne } from "@/lib/time";

export function BlockedPeriods({ periods }: { periods: BlockedPeriod[] }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await addBlockedPeriod({
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt: String(formData.get("endsAt") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
    setPending(false);
    if (!result.ok) return setError(t(result.error));
    toast.success(t("availability.blockedAdded"));
  }

  async function remove(id: string) {
    const result = await deleteBlockedPeriod(id);
    if (!result.ok) return setError(t(result.error));
    toast.success(t("availability.blockedRemoved"));
  }

  return (
    <section className="space-y-4" aria-labelledby="blocked-heading">
      <h2 id="blocked-heading" className="text-lg font-semibold">
        {t("availability.blockedPeriods")}
      </h2>
      <form action={submit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="blocked-start">{t("availability.blockedStart")}</FieldLabel>
          <Input id="blocked-start" name="startsAt" type="datetime-local" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="blocked-end">{t("availability.blockedEnd")}</FieldLabel>
          <Input id="blocked-end" name="endsAt" type="datetime-local" required />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="blocked-reason">{t("availability.reason")}</FieldLabel>
          <Input id="blocked-reason" name="reason" maxLength={200} />
        </Field>
        {error ? <FieldError className="sm:col-span-2">{error}</FieldError> : null}
        <Button type="submit" disabled={pending} className="sm:w-fit">
          {t("availability.addBlocked")}
        </Button>
      </form>

      {periods.length ? (
        <ul className="space-y-2">
          {periods.map((period) => (
            <li
              key={period.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">
                  {formatMelbourne(period.startsAt)} – {formatMelbourne(period.endsAt)}
                </p>
                {period.reason ? (
                  <p className="text-muted-foreground text-sm">{period.reason}</p>
                ) : null}
              </div>
              <Button type="button" variant="outline" onClick={() => remove(period.id)}>
                {t("common.delete")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("availability.noBlockedPeriods")}</p>
      )}
    </section>
  );
}
