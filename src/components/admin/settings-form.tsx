"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateGeneralSettings } from "@/actions/settings";
import { BanglaBadge } from "@/components/shared/bangla-badge";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { generalSettingsSchema, type GeneralSettings } from "@/lib/validators/settings";

/** Reference admin form: same pattern as LoginForm, no Turnstile, toast on success. */
export function SettingsForm({ defaultValues }: { defaultValues: GeneralSettings }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);

  const form = useForm<GeneralSettings>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await updateGeneralSettings(values);
    if (!result.ok) {
      setServerError(result.error);
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) {
          form.setError(name as keyof GeneralSettings, { message: messages[0] });
        }
      }
      return;
    }
    form.reset(result.data);
    toast.success(t("admin.settings.saved"));
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-lg space-y-6">
      <FieldGroup>
        <Field data-invalid={!!errors.studioName || undefined}>
          <FieldLabel htmlFor="studioName">{t("admin.settings.studioName")}</FieldLabel>
          <Input
            id="studioName"
            aria-invalid={!!errors.studioName || undefined}
            aria-describedby={errors.studioName ? "studioName-error" : undefined}
            {...form.register("studioName")}
          />
          <FieldMessage id="studioName-error" error={errors.studioName} />
        </Field>

        <Field data-invalid={!!errors.tagline || undefined}>
          <FieldLabel htmlFor="tagline">{t("admin.settings.tagline")}</FieldLabel>
          <Input
            id="tagline"
            aria-invalid={!!errors.tagline || undefined}
            aria-describedby={errors.tagline ? "tagline-error" : undefined}
            {...form.register("tagline")}
          />
          <FieldMessage id="tagline-error" error={errors.tagline} />
        </Field>

        <Field data-invalid={!!errors.taglineBn || undefined}>
          <FieldLabel htmlFor="taglineBn">
            {t("admin.settings.taglineBn")}
            <BanglaBadge />
          </FieldLabel>
          <Input
            id="taglineBn"
            lang="bn"
            aria-invalid={!!errors.taglineBn || undefined}
            aria-describedby={errors.taglineBn ? "taglineBn-error" : "taglineBn-hint"}
            {...form.register("taglineBn")}
          />
          <FieldDescription id="taglineBn-hint">
            {t("admin.settings.taglineBnHint")}
          </FieldDescription>
          <FieldMessage id="taglineBn-error" error={errors.taglineBn} />
        </Field>
      </FieldGroup>

      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}

      <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
        {t("common.save")}
      </SubmitButton>
    </form>
  );
}
