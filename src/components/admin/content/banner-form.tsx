"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateSeasonalBannerSettings } from "@/actions/settings";
import { BanglaBadge } from "@/components/shared/bangla-badge";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { z } from "zod";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  seasonalBannerSettingsSchema,
  type SeasonalBannerSettings,
} from "@/lib/validators/settings";

type BannerValues = z.input<typeof seasonalBannerSettingsSchema>;

/** The seasonal banner's switch and copy (the colour is slice #13's). */
export function BannerForm({ defaultValues }: { defaultValues: SeasonalBannerSettings }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<BannerValues, unknown, SeasonalBannerSettings>({
    resolver: zodResolver(seasonalBannerSettingsSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await updateSeasonalBannerSettings(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    form.reset(result.data);
    toast.success(t("admin.banner.saved"));
  });

  const input = (name: keyof BannerValues, label: MessageKey, lang?: string) => (
    <Field data-invalid={!!errors[name] || undefined}>
      <FieldLabel htmlFor={name}>
        {t(label)}
        {name.endsWith("Bn") ? <BanglaBadge /> : null}
      </FieldLabel>
      <Input id={name} lang={lang} {...form.register(name)} />
      <FieldMessage error={errors[name]} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-8">
      <Controller
        control={form.control}
        name="enabled"
        render={({ field }) => (
          <Field orientation="horizontal">
            <Switch id="enabled" checked={field.value} onCheckedChange={(v) => field.onChange(v)} />
            <FieldLabel htmlFor="enabled" className="font-normal">
              {t("admin.banner.enabled")}
            </FieldLabel>
          </Field>
        )}
      />
      <FieldGroup>
        {input("label", "admin.banner.label")}
        {input("labelBn", "admin.banner.labelBn", "bn")}
        {input("headline", "admin.banner.headline")}
        {input("headlineBn", "admin.banner.headlineBn", "bn")}
        {input("buttonLabel", "admin.banner.buttonLabel")}
        {input("buttonLabelBn", "admin.banner.buttonLabelBn", "bn")}
        {input("href", "admin.banner.href")}
      </FieldGroup>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
        {t("common.save")}
      </SubmitButton>
    </form>
  );
}
