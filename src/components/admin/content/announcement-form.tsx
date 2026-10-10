"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateAnnouncementSettings } from "@/actions/settings";
import { BanglaBadge } from "@/components/shared/bangla-badge";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import type { z } from "zod";
import { announcementSettingsSchema, type AnnouncementSettings } from "@/lib/validators/settings";

type AnnouncementValues = z.input<typeof announcementSettingsSchema>;

/** OD-33: the strip's switch and up to five messages. */
export function AnnouncementForm({ defaultValues }: { defaultValues: AnnouncementSettings }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<AnnouncementValues, unknown, AnnouncementSettings>({
    resolver: zodResolver(announcementSettingsSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "messages" });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await updateAnnouncementSettings(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    form.reset(result.data);
    toast.success(t("admin.announcement.saved"));
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-8">
      <Controller
        control={form.control}
        name="enabled"
        render={({ field }) => (
          <Field orientation="horizontal">
            <Switch id="enabled" checked={field.value} onCheckedChange={(v) => field.onChange(v)} />
            <FieldLabel htmlFor="enabled" className="font-normal">
              {t("admin.announcement.enabled")}
            </FieldLabel>
          </Field>
        )}
      />
      <ul className="space-y-6">
        {fields.map((item, index) => (
          <li key={item.id} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{t("admin.announcement.message", { n: index + 1 })}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => remove(index)}
                aria-label={t("admin.announcement.remove", { n: index + 1 })}
              >
                {t("common.delete")}
              </Button>
            </div>
            <FieldGroup>
              <Field data-invalid={!!errors.messages?.[index]?.text || undefined}>
                <FieldLabel htmlFor={`messages.${index}.text`}>
                  {t("admin.announcement.text")}
                </FieldLabel>
                <Input id={`messages.${index}.text`} {...form.register(`messages.${index}.text`)} />
                <FieldMessage error={errors.messages?.[index]?.text} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`messages.${index}.textBn`}>
                  {t("admin.announcement.textBn")}
                  <BanglaBadge />
                </FieldLabel>
                <Input
                  id={`messages.${index}.textBn`}
                  lang="bn"
                  {...form.register(`messages.${index}.textBn`)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`messages.${index}.href`}>
                    {t("admin.announcement.href")}
                  </FieldLabel>
                  <Input
                    id={`messages.${index}.href`}
                    {...form.register(`messages.${index}.href`)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`messages.${index}.linkLabel`}>
                    {t("admin.announcement.linkLabel")}
                  </FieldLabel>
                  <Input
                    id={`messages.${index}.linkLabel`}
                    {...form.register(`messages.${index}.linkLabel`)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`messages.${index}.linkLabelBn`}>
                    {t("admin.announcement.linkLabelBn")}
                    <BanglaBadge />
                  </FieldLabel>
                  <Input
                    id={`messages.${index}.linkLabelBn`}
                    lang="bn"
                    {...form.register(`messages.${index}.linkLabelBn`)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={fields.length >= 5}
          onClick={() => append({ text: "", textBn: "", linkLabel: "", linkLabelBn: "", href: "" })}
        >
          {t("admin.announcement.add")}
        </Button>
        <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
      </div>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
    </form>
  );
}
