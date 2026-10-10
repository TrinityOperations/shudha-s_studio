"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { submitContactMessage } from "@/actions/contact";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { TurnstileField } from "@/components/shared/turnstile-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  contactFormSchema,
  emptyContactForm,
  type ContactFormInput,
  type ContactFormValues,
} from "@/lib/validators/contact";

/** PW-42: the public contact form (same pattern as the booking form). */
export function ContactForm() {
  const t = useT();
  const turnstile = useRef<TurnstileInstance>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ContactFormValues, unknown, ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: emptyContactForm,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget;
    return form.handleSubmit(async (values) => {
      setServerError(null);
      const formData = new FormData();
      formData.set("name", values.name);
      formData.set("email", values.email);
      formData.set("phone", formElement.phone.value);
      formData.set("message", values.message);
      formData.set("turnstileToken", values.turnstileToken);
      const result = await submitContactMessage(formData);
      turnstile.current?.reset();
      form.setValue("turnstileToken", "");
      if (!result.ok) {
        setServerError(result.error);
        for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0])
            form.setError(name as keyof ContactFormValues, { message: messages[0] });
        }
        return;
      }
      setSentTo(values.name);
    })(event);
  };

  if (sentTo) {
    return (
      <section
        aria-live="polite"
        className="bg-muted/30 space-y-4 rounded-xl border p-6"
        data-testid="contact-sent"
      >
        <h2 className="font-heading text-ink text-2xl">{t("contact.sent.title")}</h2>
        <p>{t("contact.sent.body", { name: sentTo })}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSentTo(null);
            form.reset(emptyContactForm);
          }}
        >
          {t("contact.sent.again")}
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup>
        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor="name">{t("contact.form.name")}</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name || undefined}
            {...form.register("name")}
          />
          <FieldMessage error={errors.name} />
        </Field>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">{t("contact.form.email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={!!errors.email || undefined}
            {...form.register("email")}
          />
          <FieldMessage error={errors.email} />
        </Field>
        <Field data-invalid={!!errors.phone || undefined}>
          <FieldLabel htmlFor="phone">{t("contact.form.phone")}</FieldLabel>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-describedby="phone-hint"
            aria-invalid={!!errors.phone || undefined}
            {...form.register("phone")}
          />
          <FieldDescription id="phone-hint">{t("contact.form.phoneHint")}</FieldDescription>
          <FieldMessage error={errors.phone} />
        </Field>
        <Field data-invalid={!!errors.message || undefined}>
          <FieldLabel htmlFor="message">{t("contact.form.message")}</FieldLabel>
          <Textarea
            id="message"
            rows={6}
            aria-describedby="message-hint"
            aria-invalid={!!errors.message || undefined}
            {...form.register("message")}
          />
          <FieldDescription id="message-hint">{t("contact.form.messageHint")}</FieldDescription>
          <FieldMessage error={errors.message} />
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
      <SubmitButton pending={isSubmitting} pendingLabel={t("contact.form.submitting")}>
        {t("contact.form.submit")}
      </SubmitButton>
    </form>
  );
}
