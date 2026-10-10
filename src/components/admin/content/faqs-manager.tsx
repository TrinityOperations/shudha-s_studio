"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createFaq, deleteFaq, reorderFaqs, updateFaq } from "@/actions/faqs";
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
import type { Faq } from "@/db/schema";
import { useT } from "@/lib/i18n/client";
import { emptyFaq, faqSchema, type FaqValues } from "@/lib/validators/faqs";
import { OrderedList } from "./ordered-list";

/** OD-30: add, edit, hide, reorder and delete the FAQ entries. */
export function FaqsManager({ faqs }: { faqs: Faq[] }) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [pending, startTransition] = useTransition();

  function reorder(ids: string[]) {
    startTransition(async () => {
      const result = await reorderFaqs({ ids });
      if (!result.ok) return void toast.error(t(result.error));
      toast.success(t("admin.faqs.reordered"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <FaqForm
          faq={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" onClick={() => setEditing("new")}>
          {t("admin.faqs.add")}
        </Button>
      )}
      {faqs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("admin.faqs.empty")}</p>
      ) : (
        <OrderedList
          items={faqs}
          onReorder={reorder}
          labels={{ up: t("admin.faqs.moveUp"), down: t("admin.faqs.moveDown") }}
          render={(faq) => (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{faq.question}</h3>
                {!faq.published ? <Badge variant="outline">{t("admin.faqs.hidden")}</Badge> : null}
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">{faq.answer}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setEditing(faq)}
                >
                  {t("admin.faqs.edit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setDeleting(faq)}
                >
                  {t("admin.faqs.delete")}
                </Button>
              </div>
            </div>
          )}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("admin.faqs.deleteTitle")}
        description={t("admin.faqs.deleteBody")}
        confirmLabel={t("admin.faqs.delete")}
        destructive
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleting) return;
            const result = await deleteFaq(deleting.id);
            setDeleting(null);
            if (!result.ok) return void toast.error(t(result.error));
            toast.success(t("admin.faqs.deleted"));
            router.refresh();
          })
        }
      />
    </div>
  );
}

function FaqForm({
  faq,
  onDone,
  onCancel,
}: {
  faq: Faq | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const form = useForm<FaqValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: faq
      ? {
          question: faq.question,
          questionBn: faq.questionBn ?? "",
          answer: faq.answer,
          answerBn: faq.answerBn ?? "",
          published: faq.published,
        }
      : emptyFaq,
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    const result = faq ? await updateFaq(faq.id, values) : await createFaq(values);
    if (!result.ok) {
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) form.setError(name as keyof FaqValues, { message: messages[0] });
      }
      toast.error(t(result.error));
      return;
    }
    toast.success(t("admin.faqs.saved"));
    onDone();
  });
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-lg border p-4"
      aria-label={faq ? t("admin.faqs.edit") : t("admin.faqs.new")}
    >
      <h2 className="font-medium">{faq ? t("admin.faqs.edit") : t("admin.faqs.new")}</h2>
      <FieldGroup>
        <Field data-invalid={!!errors.question || undefined}>
          <FieldLabel htmlFor="question">{t("admin.faqs.question")}</FieldLabel>
          <Input id="question" {...form.register("question")} />
          <FieldMessage error={errors.question} />
        </Field>
        <Field>
          <FieldLabel htmlFor="questionBn">
            {t("admin.faqs.questionBn")}
            <BanglaBadge />
          </FieldLabel>
          <Input id="questionBn" lang="bn" {...form.register("questionBn")} />
        </Field>
        <Field data-invalid={!!errors.answer || undefined}>
          <FieldLabel htmlFor="answer">{t("admin.faqs.answer")}</FieldLabel>
          <Textarea id="answer" rows={4} {...form.register("answer")} />
          <FieldMessage error={errors.answer} />
        </Field>
        <Field>
          <FieldLabel htmlFor="answerBn">
            {t("admin.faqs.answerBn")}
            <BanglaBadge />
          </FieldLabel>
          <Textarea id="answerBn" lang="bn" rows={4} {...form.register("answerBn")} />
        </Field>
        <Controller
          control={form.control}
          name="published"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch
                id="published"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v)}
              />
              <FieldLabel htmlFor="published" className="font-normal">
                {t("admin.faqs.published")}
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
