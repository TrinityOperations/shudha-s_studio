"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { submitGalleryPhoto } from "@/actions/gallery";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { TurnstileField } from "@/components/shared/turnstile-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prepareImageForUpload } from "@/lib/client-image";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  emptyGalleryForm,
  GALLERY_FIRST_NAME_MAX,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_IMAGE_TYPES,
  GALLERY_NOTE_MAX,
  galleryFormSchema,
  isGalleryImageType,
  type GalleryFormInput,
  type GalleryFormValues,
} from "@/lib/validators/gallery";

type Props = { onDone?: () => void };

/** PW-71: one photo, optional first name and note, required consent, Turnstile. */
export function SubmitForm({ onDone }: Props) {
  const t = useT();
  const turnstile = useRef<TurnstileInstance>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<MessageKey | null>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<GalleryFormValues, unknown, GalleryFormInput>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: emptyGalleryForm,
  });
  const { errors, isSubmitting } = form.formState;

  function choose(file: File | undefined) {
    setPhotoError(null);
    if (!file) return setPhoto(null);
    // HEIC and anything else undecodable never travels: the server's own check is the backstop.
    if (!isGalleryImageType(file.type)) {
      setPhoto(null);
      setPhotoError("errors.imageType");
      return;
    }
    if (file.size > GALLERY_IMAGE_MAX_BYTES) {
      setPhoto(null);
      setPhotoError("errors.imageTooLarge");
      return;
    }
    setPhoto(file);
  }

  // An event handler, so the Turnstile ref is read outside render (react-hooks/refs).
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async (values) => {
      setServerError(null);
      if (!photo) {
        setPhotoError("errors.photoRequired");
        return;
      }
      const formData = new FormData();
      formData.set("firstName", values.firstName);
      formData.set("note", values.note);
      formData.set("consent", values.consent ? "true" : "false");
      formData.set("turnstileToken", values.turnstileToken);
      formData.set("photo", await prepareImageForUpload(photo));
      const result = await submitGalleryPhoto(formData);
      turnstile.current?.reset();
      form.setValue("turnstileToken", "");
      if (!result.ok) {
        if (
          result.error === "errors.photoRequired" ||
          result.error === "errors.imageType" ||
          result.error === "errors.imageTooLarge"
        ) {
          setPhotoError(result.error);
        } else {
          setServerError(result.error);
        }
        for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0])
            form.setError(name as keyof GalleryFormValues, { message: messages[0] });
        }
        return;
      }
      setSent(true);
    })(event);

  if (sent) {
    return (
      <section aria-live="polite" className="space-y-4" data-testid="gallery-sent">
        <h3 className="font-heading text-ink text-2xl">{t("gallery.sent.title")}</h3>
        <p>{t("gallery.sent.body")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSent(false);
              setPhoto(null);
              form.reset(emptyGalleryForm);
            }}
          >
            {t("gallery.sent.again")}
          </Button>
          {onDone ? (
            <Button type="button" onClick={onDone}>
              {t("common.cancel")}
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="gallery-form">
      <FieldGroup>
        <Field data-invalid={!!photoError || undefined}>
          <FieldLabel htmlFor="gallery-photo">{t("gallery.form.photo")}</FieldLabel>
          <Input
            id="gallery-photo"
            type="file"
            accept={GALLERY_IMAGE_TYPES.join(",")}
            aria-describedby="gallery-photo-hint"
            aria-invalid={!!photoError || undefined}
            onChange={(event) => choose(event.target.files?.[0])}
          />
          <FieldDescription id="gallery-photo-hint">{t("gallery.form.photoHint")}</FieldDescription>
          {photoError ? <FieldError>{t(photoError)}</FieldError> : null}
        </Field>
        <Field data-invalid={!!errors.firstName || undefined}>
          <FieldLabel htmlFor="gallery-firstName">{t("gallery.form.firstName")}</FieldLabel>
          <Input
            id="gallery-firstName"
            autoComplete="given-name"
            maxLength={GALLERY_FIRST_NAME_MAX}
            {...form.register("firstName")}
          />
          <FieldMessage error={errors.firstName} />
        </Field>
        <Field data-invalid={!!errors.note || undefined}>
          <FieldLabel htmlFor="gallery-note">{t("gallery.form.note")}</FieldLabel>
          <Textarea
            id="gallery-note"
            rows={3}
            maxLength={GALLERY_NOTE_MAX}
            aria-describedby="gallery-note-hint"
            {...form.register("note")}
          />
          <FieldDescription id="gallery-note-hint">{t("gallery.form.noteHint")}</FieldDescription>
          <FieldMessage error={errors.note} />
        </Field>
        <Controller
          control={form.control}
          name="consent"
          render={({ field }) => (
            <Field
              orientation="horizontal"
              className="items-start"
              data-invalid={!!errors.consent || undefined}
            >
              <Checkbox
                id="gallery-consent"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={!!errors.consent || undefined}
              />
              <div className="space-y-1">
                <FieldLabel htmlFor="gallery-consent" className="font-normal">
                  {t("gallery.form.consent")}
                </FieldLabel>
                <FieldMessage error={errors.consent} />
              </div>
            </Field>
          )}
        />
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
      <SubmitButton pending={isSubmitting} pendingLabel={t("gallery.form.submitting")}>
        {t("gallery.form.submit")}
      </SubmitButton>
    </form>
  );
}
