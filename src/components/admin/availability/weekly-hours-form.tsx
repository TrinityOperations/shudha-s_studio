"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveWeeklyHours } from "@/actions/availability";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { weeklyHoursSchema, type WeeklyHoursInput } from "@/lib/validators/availability";

/** OD-21: one row per weekday. */
export function WeeklyHoursForm({ defaultValues }: { defaultValues: WeeklyHoursInput }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<WeeklyHoursInput>({
    resolver: zodResolver(weeklyHoursSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;
  const days = useWatch({ control: form.control, name: "days" });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await saveWeeklyHours(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    form.reset(values);
    toast.success(t("admin.availability.hours.saved"));
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("admin.availability.hours.hint")}</p>
      <ul className="divide-y rounded-lg border">
        {defaultValues.days.map((day, index) => {
          const active = days[index]?.active ?? day.active;
          const rowErrors = errors.days?.[index];
          const dayName = t(`common.weekday.${day.weekday}` as MessageKey);
          return (
            <li
              key={day.weekday}
              className="grid items-center gap-3 px-3 py-2 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <span className="font-medium">{dayName}</span>
              <Controller
                control={form.control}
                name={`days.${index}.active`}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                      aria-label={`${t("admin.availability.hours.open")}: ${dayName}`}
                    />
                    {t("admin.availability.hours.open")}
                  </label>
                )}
              />
              <Input
                type="time"
                step={300}
                disabled={!active}
                aria-label={t("admin.availability.hours.startLabel", { day: dayName })}
                aria-invalid={!!rowErrors?.startTime || undefined}
                {...form.register(`days.${index}.startTime`)}
              />
              <Input
                type="time"
                step={300}
                disabled={!active}
                aria-label={t("admin.availability.hours.endLabel", { day: dayName })}
                aria-invalid={!!rowErrors?.endTime || undefined}
                {...form.register(`days.${index}.endTime`)}
              />
              <div className="sm:col-span-4">
                <FieldMessage error={rowErrors?.startTime ?? rowErrors?.endTime} />
              </div>
            </li>
          );
        })}
      </ul>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
        {t("admin.availability.hours.save")}
      </SubmitButton>
    </form>
  );
}
