"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { createBooking } from "@/actions/booking";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { TurnstileField } from "@/components/shared/turnstile-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BookingSlot } from "@/lib/booking";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { bookingSchema, type BookingInput } from "@/lib/validators/booking";

type Product = { id: string; slug: string; title: string; titleBn: string | null };

export function BookingForm({
  slots,
  products,
  consultationTypes,
  defaultProductId,
}: {
  slots: BookingSlot[];
  products: Product[];
  consultationTypes: ("in_person" | "phone" | "video")[];
  defaultProductId?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const turnstile = useRef<TurnstileInstance>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      startsAt: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      productId: defaultProductId ?? "",
      message: "",
      consultationType: consultationTypes[0] ?? "phone",
      turnstileToken: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const groups = slots.reduce<Map<string, BookingSlot[]>>((map, slot) => {
    map.set(slot.localDate, [...(map.get(slot.localDate) ?? []), slot]);
    return map;
  }, new Map());

  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (values) => {
      setServerError(null);
      const data = new FormData(event.currentTarget);
      Object.entries(values).forEach(([key, value]) => data.set(key, String(value ?? "")));
      const result = await createBooking(data);
      if (!result.ok) {
        setServerError(result.error);
        turnstile.current?.reset();
        form.setValue("turnstileToken", "");
        return;
      }
      setSuccess(result.data.startsAt);
    })(event);

  if (success) {
    return (
      <div className="rounded-xl border p-6" role="status">
        <h2 className="text-xl font-semibold">{t("booking.successTitle")}</h2>
        <p className="text-muted-foreground mt-2">{t("booking.successDescription")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">{t("booking.chooseSlot")}</legend>
        {slots.length ? (
          <div className="space-y-5">
            {[...groups.entries()].map(([date, dateSlots]) => (
              <div key={date} className="space-y-2">
                <h3 className="font-medium">
                  {new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-AU", {
                    dateStyle: "full",
                    timeZone: "Australia/Melbourne",
                  }).format(new Date(dateSlots[0].startsAt))}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {dateSlots.map((slot) => (
                    <label
                      key={slot.startsAt}
                      className="has-checked:border-primary has-checked:bg-primary/5 focus-within:ring-ring/50 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm focus-within:ring-3"
                    >
                      <input
                        type="radio"
                        value={slot.startsAt}
                        className="sr-only"
                        {...form.register("startsAt")}
                      />
                      {new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-AU", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Australia/Melbourne",
                      }).format(new Date(slot.startsAt))}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{t("booking.noSlots")}</p>
        )}
        <FieldMessage error={errors.startsAt} />
      </fieldset>

      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        {(["customerName", "customerPhone", "customerEmail"] as const).map((name) => (
          <Field key={name} data-invalid={!!errors[name] || undefined}>
            <FieldLabel htmlFor={name}>{t(`booking.${name}` as MessageKey)}</FieldLabel>
            <Input
              id={name}
              type={name === "customerEmail" ? "email" : name === "customerPhone" ? "tel" : "text"}
              {...form.register(name)}
            />
            <FieldMessage error={errors[name]} />
          </Field>
        ))}
        <Field>
          <FieldLabel htmlFor="productId">{t("booking.product")}</FieldLabel>
          <select
            id="productId"
            className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
            {...form.register("productId")}
          >
            <option value="">{t("booking.noProduct")}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {locale === "bn" && product.titleBn ? product.titleBn : product.title}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="consultationType">{t("booking.consultationType")}</FieldLabel>
          <select
            id="consultationType"
            className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
            {...form.register("consultationType")}
          >
            {consultationTypes.map((type) => (
              <option key={type} value={type}>
                {t(`booking.consultation.${type}` as MessageKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="message">{t("booking.message")}</FieldLabel>
          <Textarea id="message" rows={5} {...form.register("message")} />
          <FieldMessage error={errors.message} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="referenceImage">{t("booking.referenceImage")}</FieldLabel>
          <Input
            id="referenceImage"
            name="referenceImage"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </Field>
        <Field className="sm:col-span-2" data-invalid={!!errors.turnstileToken || undefined}>
          <TurnstileField
            ref={turnstile}
            onVerify={(token) => form.setValue("turnstileToken", token, { shouldValidate: true })}
            onExpire={() => form.setValue("turnstileToken", "")}
          />
          <FieldMessage error={errors.turnstileToken} />
        </Field>
      </FieldGroup>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      {slots.length ? (
        <SubmitButton pending={isSubmitting} pendingLabel={t("booking.submitting")}>
          {t("booking.submit")}
        </SubmitButton>
      ) : (
        <Button type="submit" disabled>
          {t("booking.submit")}
        </Button>
      )}
    </form>
  );
}
