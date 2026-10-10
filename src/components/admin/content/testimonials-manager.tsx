"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createTestimonial,
  deleteTestimonial,
  removeTestimonialPhoto,
  reorderTestimonials,
  setTestimonialPhoto,
  updateTestimonial,
} from "@/actions/testimonials";
import { BanglaBadge } from "@/components/shared/bangla-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Testimonial } from "@/db/schema";
import { prepareImageForUpload } from "@/lib/client-image";
import { SITE_IMAGES_BUCKET } from "@/lib/home";
import { useT } from "@/lib/i18n/client";
import { publicStorageUrl } from "@/lib/storage";
import { SITE_IMAGE_TYPES } from "@/lib/validators/site-images";
import {
  emptyTestimonial,
  testimonialSchema,
  type TestimonialValues,
} from "@/lib/validators/testimonials";
import { OrderedList } from "./ordered-list";

/** OD-31: add, edit, hide, reorder, delete and give each quote an optional photo. */
export function TestimonialsManager({ testimonials }: { testimonials: Testimonial[] }) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<Testimonial | "new" | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: Parameters<typeof t>[0] }>,
    successKey: Parameters<typeof t>[0],
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(t(result.error));
      toast.success(t(successKey));
      router.refresh();
    });
  }

  async function uploadPhoto(item: Testimonial, file: File) {
    const formData = new FormData();
    formData.set("id", item.id);
    formData.set("file", await prepareImageForUpload(file));
    run(() => setTestimonialPhoto(formData), "admin.testimonials.photoSaved");
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <TestimonialForm
          item={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" onClick={() => setEditing("new")}>
          {t("admin.testimonials.add")}
        </Button>
      )}
      {testimonials.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("admin.testimonials.empty")}</p>
      ) : (
        <OrderedList
          items={testimonials}
          onReorder={(ids) =>
            run(() => reorderTestimonials({ ids }), "admin.testimonials.reordered")
          }
          labels={{ up: t("admin.testimonials.moveUp"), down: t("admin.testimonials.moveDown") }}
          render={(item) => (
            <div className="flex flex-wrap gap-4">
              <div className="bg-muted size-20 shrink-0 overflow-hidden rounded-md">
                {item.photoPath ? (
                  <Image
                    src={publicStorageUrl(
                      SITE_IMAGES_BUCKET,
                      item.photoPath.replace(/\.webp$/, "-thumb.webp"),
                    )}
                    alt=""
                    width={80}
                    height={80}
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{item.authorName}</h3>
                  {!item.visible ? (
                    <Badge variant="outline">{t("admin.testimonials.hidden")}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm">{item.quote}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => setEditing(item)}
                  >
                    {t("admin.testimonials.edit")}
                  </Button>
                  <label className="inline-flex">
                    <span className="sr-only">{t("admin.testimonials.photo")}</span>
                    <input
                      type="file"
                      accept={SITE_IMAGE_TYPES.join(",")}
                      className="sr-only"
                      disabled={pending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadPhoto(item, file);
                      }}
                    />
                    <span className="border-line hover:bg-muted inline-flex h-7 cursor-pointer items-center rounded-full border bg-white px-2.5 text-[0.8rem] font-medium">
                      {t("admin.testimonials.photo")}
                    </span>
                  </label>
                  {item.photoPath ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => removeTestimonialPhoto(item.id),
                          "admin.testimonials.photoRemoved",
                        )
                      }
                    >
                      {t("admin.testimonials.photoRemove")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => setDeleting(item)}
                  >
                    {t("admin.testimonials.delete")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("admin.testimonials.deleteTitle")}
        description={t("admin.testimonials.deleteBody")}
        confirmLabel={t("admin.testimonials.delete")}
        destructive
        pending={pending}
        onConfirm={() => {
          const item = deleting;
          setDeleting(null);
          if (item) run(() => deleteTestimonial(item.id), "admin.testimonials.deleted");
        }}
      />
    </div>
  );
}

function TestimonialForm({
  item,
  onDone,
  onCancel,
}: {
  item: Testimonial | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const form = useForm<TestimonialValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: item
      ? {
          authorName: item.authorName,
          quote: item.quote,
          quoteBn: item.quoteBn ?? "",
          visible: item.visible,
        }
      : emptyTestimonial,
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    const result = item
      ? await updateTestimonial(item.id, values)
      : await createTestimonial(values);
    if (!result.ok) {
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) form.setError(name as keyof TestimonialValues, { message: messages[0] });
      }
      toast.error(t(result.error));
      return;
    }
    toast.success(t("admin.testimonials.saved"));
    onDone();
  });
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-lg border p-4"
      aria-label={item ? t("admin.testimonials.edit") : t("admin.testimonials.new")}
    >
      <h2 className="font-medium">
        {item ? t("admin.testimonials.edit") : t("admin.testimonials.new")}
      </h2>
      <FieldGroup>
        <Field data-invalid={!!errors.authorName || undefined}>
          <FieldLabel htmlFor="authorName">{t("admin.testimonials.author")}</FieldLabel>
          <Input id="authorName" {...form.register("authorName")} />
          <FieldMessage error={errors.authorName} />
        </Field>
        <Field data-invalid={!!errors.quote || undefined}>
          <FieldLabel htmlFor="quote">{t("admin.testimonials.quote")}</FieldLabel>
          <Textarea id="quote" rows={3} {...form.register("quote")} />
          <FieldMessage error={errors.quote} />
        </Field>
        <Field>
          <FieldLabel htmlFor="quoteBn">
            {t("admin.testimonials.quoteBn")}
            <BanglaBadge />
          </FieldLabel>
          <Textarea id="quoteBn" lang="bn" rows={3} {...form.register("quoteBn")} />
        </Field>
        <Controller
          control={form.control}
          name="visible"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch
                id="visible"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v)}
              />
              <FieldLabel htmlFor="visible" className="font-normal">
                {t("admin.testimonials.visible")}
              </FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>
      <div className="flex gap-2">
        <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
