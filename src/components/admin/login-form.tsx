"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "@/actions/auth";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { TurnstileField } from "@/components/shared/turnstile-field";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

/** Reference public form: React Hook Form + Zod + Turnstile + server action (CLAUDE.md rule 6). */
export function LoginForm({ next }: { next?: string }) {
  const t = useT();
  const turnstile = useRef<TurnstileInstance>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", turnstileToken: "", next },
  });
  const { errors, isSubmitting } = form.formState;

  // Wrapped in an event handler so the ref is only read on submit, never during render.
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (values) => {
      setServerError(null);
      const result = await signIn(values);
      // On success the action redirects and never resolves here.
      if (result && !result.ok) {
        setServerError(result.error);
        turnstile.current?.reset();
        form.setValue("turnstileToken", "");
      }
    })(event);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">{t("admin.login.email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.email || undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...form.register("email")}
          />
          <FieldMessage id="email-error" error={errors.email} />
        </Field>

        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">{t("admin.login.password")}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password || undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...form.register("password")}
          />
          <FieldMessage id="password-error" error={errors.password} />
        </Field>

        <Field data-invalid={!!errors.turnstileToken || undefined}>
          <TurnstileField
            ref={turnstile}
            onVerify={(token) => form.setValue("turnstileToken", token, { shouldValidate: true })}
            onExpire={() => form.setValue("turnstileToken", "")}
          />
          <FieldMessage error={errors.turnstileToken} />
        </Field>
      </FieldGroup>

      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}

      <SubmitButton pending={isSubmitting} pendingLabel={t("common.signingIn")} className="w-full">
        {t("common.signIn")}
      </SubmitButton>
    </form>
  );
}
