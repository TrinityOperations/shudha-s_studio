"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { addBlockedPeriod, deleteBlockedPeriod } from "@/actions/availability";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { blockedPeriodSchema, type BlockedPeriodInput } from "@/lib/validators/availability";

export type BlockedPeriodItem = {
  id: string;
  startsLabel: string;
  endsLabel: string;
  reason: string | null;
};

export function BlockedPeriods({ items }: { items: BlockedPeriodItem[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<BlockedPeriodItem | null>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<BlockedPeriodInput>({
    resolver: zodResolver(blockedPeriodSchema),
    defaultValues: { startsAt: "", endsAt: "", reason: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await addBlockedPeriod(values);
    if (!result.ok) {
      setServerError(result.error);
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0])
          form.setError(name as keyof BlockedPeriodInput, { message: messages[0] });
      }
      return;
    }
    form.reset({ startsAt: "", endsAt: "", reason: "" });
    toast.success(t("admin.availability.blocked.added"));
    router.refresh();
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{t("admin.availability.blocked.hint")}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("admin.availability.blocked.empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{item.startsLabel}</span> → {item.endsLabel}
                {item.reason ? (
                  <span className="text-muted-foreground"> · {item.reason}</span>
                ) : null}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                {t("common.delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FieldGroup className="sm:grid sm:grid-cols-3">
          <Field data-invalid={!!errors.startsAt || undefined}>
            <FieldLabel htmlFor="blocked-start">{t("admin.availability.blocked.start")}</FieldLabel>
            <Input
              id="blocked-start"
              type="datetime-local"
              step={900}
              aria-invalid={!!errors.startsAt || undefined}
              {...form.register("startsAt")}
            />
            <FieldMessage error={errors.startsAt} />
          </Field>
          <Field data-invalid={!!errors.endsAt || undefined}>
            <FieldLabel htmlFor="blocked-end">{t("admin.availability.blocked.end")}</FieldLabel>
            <Input
              id="blocked-end"
              type="datetime-local"
              step={900}
              aria-invalid={!!errors.endsAt || undefined}
              {...form.register("endsAt")}
            />
            <FieldMessage error={errors.endsAt} />
          </Field>
          <Field data-invalid={!!errors.reason || undefined}>
            <FieldLabel htmlFor="blocked-reason">
              {t("admin.availability.blocked.reason")}
            </FieldLabel>
            <Input id="blocked-reason" {...form.register("reason")} />
            <FieldMessage error={errors.reason} />
          </Field>
        </FieldGroup>
        {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
        <SubmitButton pending={isSubmitting} pendingLabel={t("common.working")}>
          {t("admin.availability.blocked.add")}
        </SubmitButton>
      </form>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("admin.availability.blocked.delete.title")}
        description={t("admin.availability.blocked.delete.description")}
        confirmLabel={t("common.delete")}
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          const id = deleting.id;
          startTransition(async () => {
            const result = await deleteBlockedPeriod(id);
            if (!result.ok) {
              toast.error(t(result.error));
              return;
            }
            toast.success(t("admin.availability.blocked.deleted"));
            setDeleting(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
