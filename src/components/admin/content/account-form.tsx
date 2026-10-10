"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { changePassword } from "@/actions/account";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { accountPasswordSchema, type AccountPasswordValues } from "@/lib/validators/settings";

/** OD-34: password change; the login email is read-only (an environment setting). */
export function AccountForm({ email }: { email: string }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<AccountPasswordValues>({
    resolver: zodResolver(accountPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await changePassword(values);
    if (!result.ok) {
      setServerError(result.error);
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0])
          form.setError(name as keyof AccountPasswordValues, { message: messages[0] });
      }
      return;
    }
    form.reset();
    toast.success(t("admin.account.passwordChanged"));
  });
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{t("admin.account.email")}</FieldLabel>
          <Input id="email" value={email} readOnly aria-describedby="email-note" />
          <FieldDescription id="email-note">{t("admin.account.emailNote")}</FieldDescription>
        </Field>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">{t("admin.account.newPassword")}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-hint"
            aria-invalid={!!errors.password || undefined}
            {...form.register("password")}
          />
          <FieldDescription id="password-hint">{t("admin.account.passwordHint")}</FieldDescription>
          <FieldMessage error={errors.password} />
        </Field>
        <Field data-invalid={!!errors.confirm || undefined}>
          <FieldLabel htmlFor="confirm">{t("admin.account.repeatPassword")}</FieldLabel>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm || undefined}
            {...form.register("confirm")}
          />
          <FieldMessage error={errors.confirm} />
        </Field>
      </FieldGroup>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
        {t("admin.account.submit")}
      </SubmitButton>
    </form>
  );
}
