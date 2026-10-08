"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { BookingSummary } from "@/actions/booking";
import { createCustomOrder } from "@/actions/custom-order";
import { SlotPicker, type SlotDayOption } from "@/components/public/booking/slot-picker";
import type { WizardState } from "@/components/public/wizard/wizard-state";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { TurnstileField } from "@/components/shared/turnstile-field";
import { WISHLIST_FIELD, WishlistAttach } from "@/components/public/wishlist/wishlist-attach";
import { Button } from "@/components/ui/button";
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
import type { ConsultationType } from "@/db/schema";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { bookStepSchema, type BookStepInput, type BookStepValues } from "@/lib/validators/brief";

type Props = {
  state: WizardState;
  days: SlotDayOption[];
  consultationTypes: ConsultationType[];
  onBack: () => void;
  onBooked: (summary: BookingSummary, name: string) => void;
};

/** Pure: the wizard's answers as the action's flat fields (photos are appended separately). */
export function briefFormFields(state: WizardState): Record<string, string> {
  return {
    productType: state.productType,
    productSlug: state.productSlug,
    occasion: state.occasion,
    orderFor: state.orderFor,
    businessName: state.businessName,
    names: state.details.names,
    dates: state.details.dates,
    message: state.details.message,
    language: state.details.language,
    quantity: state.quantity,
    neededBy: state.neededBy,
  };
}

/** Step 7: the slot and contact fields of the booking form (PW-30), submitting the whole brief. */
export function BookStep({ state, days, consultationTypes, onBack, onBooked }: Props) {
  const t = useT();
  const router = useRouter();
  const turnstile = useRef<TurnstileInstance>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);

  const form = useForm<BookStepValues, unknown, BookStepInput>({
    resolver: zodResolver(bookStepSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      consultationType: consultationTypes[0] ?? "in_person",
      slotStart: "",
      turnstileToken: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  // Read the form element here: inside the async callback event.currentTarget is null.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget;
    return form.handleSubmit(async (values) => {
      setServerError(null);
      const formData = new FormData();
      for (const [name, value] of Object.entries(briefFormFields(state))) formData.set(name, value);
      formData.set("customerName", values.customerName);
      formData.set("customerPhone", formElement.customerPhone.value);
      formData.set("customerEmail", values.customerEmail);
      formData.set("consultationType", values.consultationType);
      formData.set("slotStart", values.slotStart);
      formData.set("turnstileToken", values.turnstileToken);
      for (const photo of state.photos) formData.append("photos", photo.file, photo.file.name);
      for (const slug of new FormData(formElement).getAll(WISHLIST_FIELD)) {
        formData.append(WISHLIST_FIELD, slug);
      }

      const result = await createCustomOrder(formData);
      turnstile.current?.reset();
      form.setValue("turnstileToken", "");
      if (!result.ok) {
        setServerError(result.error);
        for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0] && name in form.getValues())
            form.setError(name as keyof BookStepValues, { message: messages[0] });
        }
        if (result.error === "errors.slotTaken" || result.error === "errors.slotUnavailable") {
          form.setValue("slotStart", "");
          router.refresh();
        }
        return;
      }
      if (result.data.warning) toast.warning(t(result.data.warning));
      onBooked(result.data.summary, values.customerName);
      router.refresh();
    })(event);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{t("wizard.step7.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("wizard.step7.hint")}</p>
      </header>

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

        <WishlistAttach attachByDefault />

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

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          {t("wizard.back")}
        </Button>
        <SubmitButton pending={isSubmitting} pendingLabel={t("wizard.submitting")}>
          {t("wizard.submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
