"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { updateAvailability } from "@/actions/availability";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  availabilitySettingsSchema,
  type AvailabilitySettings,
} from "@/lib/validators/availability";

const consultationTypes = ["in_person", "phone", "video"] as const;

export function AvailabilityForm({ defaultValues }: { defaultValues: AvailabilitySettings }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<AvailabilitySettings>({
    resolver: zodResolver(availabilitySettingsSchema),
    defaultValues,
  });
  const watchedRules = useWatch({ control: form.control, name: "rules" });
  const watchedConsultationTypes = useWatch({
    control: form.control,
    name: "consultationTypes",
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await updateAvailability(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    form.reset(result.data);
    toast.success(t("availability.saved"));
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <section className="space-y-4" aria-labelledby="weekly-hours-heading">
        <h2 id="weekly-hours-heading" className="text-lg font-semibold">
          {t("availability.weeklyHours")}
        </h2>
        <div className="space-y-3">
          {defaultValues.rules.map((rule, index) => (
            <div
              key={rule.weekday}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_1fr] sm:items-end"
            >
              <Field orientation="horizontal">
                <Checkbox
                  id={`weekday-${rule.weekday}`}
                  checked={watchedRules[index]?.active ?? false}
                  onCheckedChange={(checked) =>
                    form.setValue(`rules.${index}.active`, checked === true, { shouldDirty: true })
                  }
                />
                <FieldLabel htmlFor={`weekday-${rule.weekday}`}>
                  {t(`availability.weekday.${rule.weekday}` as MessageKey)}
                </FieldLabel>
              </Field>
              <input
                type="hidden"
                {...form.register(`rules.${index}.weekday`, { valueAsNumber: true })}
              />
              <Field data-invalid={!!errors.rules?.[index]?.startTime || undefined}>
                <FieldLabel htmlFor={`start-${rule.weekday}`}>
                  {t("availability.startTime")}
                </FieldLabel>
                <Input
                  id={`start-${rule.weekday}`}
                  type="time"
                  {...form.register(`rules.${index}.startTime`)}
                />
                <FieldMessage error={errors.rules?.[index]?.startTime} />
              </Field>
              <Field data-invalid={!!errors.rules?.[index]?.endTime || undefined}>
                <FieldLabel htmlFor={`end-${rule.weekday}`}>{t("availability.endTime")}</FieldLabel>
                <Input
                  id={`end-${rule.weekday}`}
                  type="time"
                  {...form.register(`rules.${index}.endTime`)}
                />
                <FieldMessage error={errors.rules?.[index]?.endTime} />
              </Field>
            </div>
          ))}
        </div>
      </section>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {(["slotMinutes", "bufferMinutes", "horizonDays", "minNoticeHours"] as const).map(
          (name) => (
            <Field key={name} data-invalid={!!errors[name] || undefined}>
              <FieldLabel htmlFor={name}>{t(`availability.${name}` as MessageKey)}</FieldLabel>
              <Input
                id={name}
                type="number"
                min="0"
                {...form.register(name, { valueAsNumber: true })}
              />
              <FieldMessage error={errors[name]} />
            </Field>
          ),
        )}
      </FieldGroup>

      <fieldset className="space-y-3">
        <legend className="font-medium">{t("availability.consultationTypes")}</legend>
        <div className="flex flex-wrap gap-4">
          {consultationTypes.map((type) => (
            <Field key={type} orientation="horizontal">
              <Checkbox
                id={`consultation-${type}`}
                checked={watchedConsultationTypes.includes(type)}
                onCheckedChange={(checked) => {
                  const current = form.getValues("consultationTypes");
                  form.setValue(
                    "consultationTypes",
                    checked === true
                      ? [...new Set([...current, type])]
                      : current.filter((item) => item !== type),
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
              <FieldLabel htmlFor={`consultation-${type}`}>
                {t(`booking.consultation.${type}` as MessageKey)}
              </FieldLabel>
            </Field>
          ))}
        </div>
        {errors.consultationTypes?.message ? (
          <FieldError>{t(errors.consultationTypes.message as MessageKey)}</FieldError>
        ) : null}
      </fieldset>

      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
        {t("common.save")}
      </SubmitButton>
    </form>
  );
}
