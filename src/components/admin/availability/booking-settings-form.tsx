"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, type FieldError as RhfFieldError } from "react-hook-form";
import { toast } from "sonner";
import { saveBookingSettings } from "@/actions/availability";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CONSULTATION_TYPES } from "@/lib/booking/defaults";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { bookingSettingsSchema, type BookingSettingsInput } from "@/lib/validators/availability";

const NUMBER_FIELDS = [
  { name: "slotMinutes", label: "admin.availability.settings.slotMinutes", min: 15, max: 120 },
  { name: "bufferMinutes", label: "admin.availability.settings.bufferMinutes", min: 0, max: 60 },
  { name: "horizonDays", label: "admin.availability.settings.horizonDays", min: 7, max: 90 },
  { name: "minNoticeHours", label: "admin.availability.settings.minNoticeHours", min: 0, max: 168 },
] as const;

export function BookingSettingsForm({ defaultValues }: { defaultValues: BookingSettingsInput }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<BookingSettingsInput>({
    resolver: zodResolver(bookingSettingsSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await saveBookingSettings(values);
    if (!result.ok) {
      setServerError(result.error);
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0])
          form.setError(name as keyof BookingSettingsInput, { message: messages[0] });
      }
      return;
    }
    form.reset(result.data);
    toast.success(t("admin.availability.settings.saved"));
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup className="sm:grid sm:grid-cols-2">
        {NUMBER_FIELDS.map((f) => (
          <Field key={f.name} data-invalid={!!errors[f.name] || undefined}>
            <FieldLabel htmlFor={f.name}>{t(f.label)}</FieldLabel>
            <Input
              id={f.name}
              type="number"
              inputMode="numeric"
              min={f.min}
              max={f.max}
              aria-invalid={!!errors[f.name] || undefined}
              {...form.register(f.name, {
                setValueAs: (v) => (v === "" || v === null ? Number.NaN : Number(v)),
              })}
            />
            <FieldMessage error={errors[f.name]} />
          </Field>
        ))}
      </FieldGroup>

      <Controller
        control={form.control}
        name="consultationTypes"
        render={({ field }) => (
          <FieldSet>
            <FieldLegend>{t("admin.availability.settings.types")}</FieldLegend>
            <FieldGroup className="gap-2">
              {CONSULTATION_TYPES.map((type) => (
                <Field key={type} orientation="horizontal">
                  <Checkbox
                    id={`type-${type}`}
                    checked={field.value.includes(type)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked ? [...field.value, type] : field.value.filter((v) => v !== type),
                      )
                    }
                  />
                  <FieldLabel htmlFor={`type-${type}`} className="font-normal">
                    {t(`booking.type.${type}` as MessageKey)}
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
            <FieldMessage
              error={errors.consultationTypes as unknown as RhfFieldError | undefined}
            />
          </FieldSet>
        )}
      />

      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
        {t("admin.availability.settings.save")}
      </SubmitButton>
    </form>
  );
}
