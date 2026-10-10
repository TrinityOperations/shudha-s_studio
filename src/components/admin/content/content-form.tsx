"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateContentSettings } from "@/actions/settings";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  contentSettingsSchema,
  type ContentSettingsInput,
  type ContentSettingsValues,
} from "@/lib/validators/settings";

/** OD-30: her story, the delivery note, contact details, social links and the legal pages. */
export function ContentForm({ defaultValues }: { defaultValues: ContentSettingsValues }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<ContentSettingsValues, unknown, ContentSettingsInput>({
    resolver: zodResolver(contentSettingsSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await updateContentSettings(values);
    if (!result.ok) {
      setServerError(result.error);
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0])
          form.setError(name as keyof ContentSettingsValues, { message: messages[0] });
      }
      return;
    }
    form.reset(result.data);
    toast.success(t("admin.content.saved"));
  });

  const text = (
    name: keyof ContentSettingsValues,
    label: MessageKey,
    rows: number,
    hint?: MessageKey,
    lang?: string,
  ) => (
    <Field data-invalid={!!errors[name] || undefined}>
      <FieldLabel htmlFor={name}>{t(label)}</FieldLabel>
      <Textarea
        id={name}
        rows={rows}
        lang={lang}
        aria-describedby={hint ? `${name}-hint` : undefined}
        {...form.register(name)}
      />
      {hint ? <FieldDescription id={`${name}-hint`}>{t(hint)}</FieldDescription> : null}
      <FieldMessage error={errors[name]} />
    </Field>
  );
  const input = (
    name: keyof ContentSettingsValues,
    label: MessageKey,
    type: string,
    hint?: MessageKey,
  ) => (
    <Field data-invalid={!!errors[name] || undefined}>
      <FieldLabel htmlFor={name}>{t(label)}</FieldLabel>
      <Input
        id={name}
        type={type}
        aria-invalid={!!errors[name] || undefined}
        aria-describedby={hint ? `${name}-hint` : undefined}
        {...form.register(name)}
      />
      {hint ? <FieldDescription id={`${name}-hint`}>{t(hint)}</FieldDescription> : null}
      <FieldMessage error={errors[name]} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-10">
      <FieldGroup>
        {text("story", "admin.content.story", 8, "admin.content.storyHint")}
        {text("storyBn", "admin.content.storyBn", 8, undefined, "bn")}
        {text("deliveryNote", "admin.content.deliveryNote", 3, "admin.content.deliveryNoteHint")}
        {text("deliveryNoteBn", "admin.content.deliveryNoteBn", 3, undefined, "bn")}
      </FieldGroup>
      <section className="space-y-4" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="text-lg font-semibold">
          {t("admin.content.contact")}
        </h2>
        <FieldGroup>
          {input("whatsappNumber", "admin.content.whatsapp", "tel", "admin.content.whatsappHint")}
          {input("email", "admin.content.email", "email")}
        </FieldGroup>
      </section>
      <section className="space-y-4" aria-labelledby="social-heading">
        <h2 id="social-heading" className="text-lg font-semibold">
          {t("admin.content.social")}
        </h2>
        <FieldGroup>
          {input("instagram", "admin.content.instagram", "url")}
          {input("facebook", "admin.content.facebook", "url")}
        </FieldGroup>
      </section>
      <section className="space-y-4" aria-labelledby="legal-heading">
        <h2 id="legal-heading" className="text-lg font-semibold">
          {t("admin.content.legal")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("admin.content.legalHint")}</p>
        <FieldGroup>
          {text("privacy", "admin.content.privacy", 10)}
          {text("privacyBn", "admin.content.privacyBn", 6, undefined, "bn")}
          {text("terms", "admin.content.terms", 10)}
          {text("termsBn", "admin.content.termsBn", 6, undefined, "bn")}
        </FieldGroup>
      </section>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
        {t("common.save")}
      </SubmitButton>
    </form>
  );
}
