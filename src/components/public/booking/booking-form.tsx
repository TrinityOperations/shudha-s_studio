"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBooking, type BookingSummary } from "@/actions/booking";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { TurnstileField } from "@/components/shared/turnstile-field";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ConsultationType } from "@/db/schema";
import { prepareImageForUpload } from "@/lib/client-image";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  bookingFormSchema,
  emptyBookingForm,
  REFERENCE_IMAGE_TYPES,
  type BookingFormInput,
  type BookingFormValues,
} from "@/lib/validators/booking";
import { BookingConfirmation } from "./booking-confirmation";
import { SlotPicker, type SlotDayOption } from "./slot-picker";

export type ProductChoice = { slug: string; title: string; titleBn: string | null };

type Props = {
  days: SlotDayOption[];
  products: ProductChoice[];
  consultationTypes: ConsultationType[];
  initialProductSlug: string;
};

const NONE = "none";

/** PW-30, PW-33, PW-38: the public booking form. Reference public-form pattern plus a file field. */
export function BookingForm({ days, products, consultationTypes, initialProductSlug }: Props) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const turnstile = useRef<TurnstileInstance>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const [summary, setSummary] = useState<{ summary: BookingSummary; name: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<BookingFormValues, unknown, BookingFormInput>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      ...emptyBookingForm,
      consultationType: consultationTypes[0] ?? "in_person",
      productSlug: products.some((p) => p.slug === initialProductSlug) ? initialProductSlug : "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  // Read the form element here: inside the async callback event.currentTarget is null.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget;
    return form.handleSubmit(async (values) => {
      setServerError(null);
      const formData = new FormData();
      formData.set("customerName", values.customerName);
      formData.set("customerPhone", formElement.customerPhone.value);
      formData.set("customerEmail", values.customerEmail);
      formData.set("consultationType", values.consultationType);
      formData.set("productSlug", values.productSlug);
      formData.set("slotStart", values.slotStart);
      formData.set("message", values.message);
      formData.set("turnstileToken", values.turnstileToken);
      if (imageFile) formData.set("referenceImage", await prepareImageForUpload(imageFile));

      const result = await createBooking(formData);
      turnstile.current?.reset();
      form.setValue("turnstileToken", "");
      if (!result.ok) {
        setServerError(result.error);
        for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0])
            form.setError(name as keyof BookingFormValues, { message: messages[0] });
        }
        if (result.error === "errors.slotTaken" || result.error === "errors.slotUnavailable") {
          form.setValue("slotStart", "");
          router.refresh();
        }
        return;
      }
      if (result.data.warning) toast.warning(t(result.data.warning));
      setSummary({ summary: result.data.summary, name: values.customerName });
      router.refresh();
    })(event);
  };

  if (summary) {
    return (
      <BookingConfirmation
        summary={summary.summary}
        name={summary.name}
        onReset={() => {
          setSummary(null);
          setImageFile(null);
          form.reset({
            ...emptyBookingForm,
            consultationType: consultationTypes[0] ?? "in_person",
          });
        }}
      />
    );
  }

  const productItems = [
    { value: NONE, label: t("booking.form.productNone") },
    ...products.map((p) => ({
      value: p.slug,
      label: locale === "bn" && p.titleBn ? p.titleBn : p.title,
    })),
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <Controller
        control={form.control}
        name="slotStart"
        render={({ field }) => (
          <div className="space-y-2">
            <SlotPicker
              days={days}
              value={field.value ?? ""}
              onChange={field.onChange}
              invalid={!!errors.slotStart}
              describedBy="slot-note"
            />
            <p id="slot-note" className="text-muted-foreground text-xs">
              {t("booking.timezoneNote")}
            </p>
            <FieldMessage error={errors.slotStart} />
          </div>
        )}
      />

      <FieldGroup>
        <Field data-invalid={!!errors.customerName || undefined}>
          <FieldLabel htmlFor="customerName">{t("booking.form.name")}</FieldLabel>
          <Input
            id="customerName"
            autoComplete="name"
            aria-invalid={!!errors.customerName || undefined}
            {...form.register("customerName")}
          />
          <FieldMessage error={errors.customerName} />
        </Field>

        <Field data-invalid={!!errors.customerPhone || undefined}>
          <FieldLabel htmlFor="customerPhone">{t("booking.form.whatsapp")}</FieldLabel>
          <Input
            id="customerPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={!!errors.customerPhone || undefined}
            aria-describedby="customerPhone-hint"
            {...form.register("customerPhone")}
          />
          <FieldDescription id="customerPhone-hint">
            {t("booking.form.whatsappHint")}
          </FieldDescription>
          <FieldMessage error={errors.customerPhone} />
        </Field>

        <Field data-invalid={!!errors.customerEmail || undefined}>
          <FieldLabel htmlFor="customerEmail">{t("booking.form.email")}</FieldLabel>
          <Input
            id="customerEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={!!errors.customerEmail || undefined}
            {...form.register("customerEmail")}
          />
          <FieldMessage error={errors.customerEmail} />
        </Field>

        <Controller
          control={form.control}
          name="consultationType"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>{t("booking.form.type")}</FieldLegend>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                className="gap-2"
              >
                {consultationTypes.map((type) => (
                  <Field key={type} orientation="horizontal">
                    <RadioGroupItem value={type} id={`type-${type}`} />
                    <FieldLabel htmlFor={`type-${type}`} className="font-normal">
                      {t(`booking.type.${type}` as MessageKey)}
                    </FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
              <FieldMessage error={errors.consultationType} />
            </FieldSet>
          )}
        />

        <Field data-invalid={!!errors.productSlug || undefined} className="max-w-md">
          <FieldLabel htmlFor="productSlug">{t("booking.form.product")}</FieldLabel>
          <Controller
            control={form.control}
            name="productSlug"
            render={({ field }) => (
              <Select
                items={productItems}
                value={field.value || NONE}
                onValueChange={(value) => field.onChange(value && value !== NONE ? value : "")}
              >
                <SelectTrigger id="productSlug" onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldMessage error={errors.productSlug} />
        </Field>

        <Field data-invalid={!!errors.message || undefined}>
          <FieldLabel htmlFor="message">{t("booking.form.message")}</FieldLabel>
          <Textarea
            id="message"
            rows={4}
            aria-describedby="message-hint"
            {...form.register("message")}
          />
          <FieldDescription id="message-hint">{t("booking.form.messageHint")}</FieldDescription>
          <FieldMessage error={errors.message} />
        </Field>

        <Field>
          <FieldLabel htmlFor="referenceImage">{t("booking.form.image")}</FieldLabel>
          <Input
            id="referenceImage"
            type="file"
            accept={REFERENCE_IMAGE_TYPES.join(",")}
            aria-describedby="referenceImage-hint"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
          <FieldDescription id="referenceImage-hint">
            {t("booking.form.imageHint")}
          </FieldDescription>
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

      <SubmitButton
        pending={isSubmitting}
        pendingLabel={t("booking.form.submitting")}
        className="w-full sm:w-auto"
      >
        {t("booking.form.submit")}
      </SubmitButton>
    </form>
  );
}
