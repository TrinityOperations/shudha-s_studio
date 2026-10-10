"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createTaxonomyItem,
  deleteTaxonomyItem,
  reorderTaxonomy,
  updateTaxonomyItem,
} from "@/actions/taxonomy";
import { BanglaBadge } from "@/components/shared/bangla-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import {
  taxonomyItemSchema,
  type SortableTaxonomyKind,
  type TaxonomyItemInput,
  type TaxonomyKind,
} from "@/lib/validators/taxonomy";

export type TaxonomyListItem = {
  id: string;
  name: string;
  nameBn: string | null;
  productCount: number;
};

type Props = {
  kind: TaxonomyKind;
  items: TaxonomyListItem[];
};

const DELETE_KEY: Record<TaxonomyKind, MessageKey> = {
  category: "admin.taxonomy.delete.category",
  occasion: "admin.taxonomy.delete.occasion",
  tag: "admin.taxonomy.delete.tag",
};

/** One editor for categories, occasions (reorderable) and tags (alphabetical). */
export function TaxonomyList({ kind, items }: Props) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  const [renaming, setRenaming] = useState<TaxonomyListItem | null>(null);
  const [deleting, setDeleting] = useState<TaxonomyListItem | null>(null);
  const reorderable = kind !== "tag";

  if (items !== prevItems) {
    setPrevItems(items);
    setOrder(items);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    startTransition(async () => {
      const result = await reorderTaxonomy({
        kind: kind as SortableTaxonomyKind,
        ids: next.map((item) => item.id),
      });
      if (!result.ok) {
        toast.error(t(result.error));
        setOrder(items);
        return;
      }
      toast.success(t("admin.taxonomy.toast.reordered"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <TaxonomyItemForm
        key="create"
        submitLabel={t("common.add")}
        onSubmit={async (values) => {
          const result = await createTaxonomyItem(kind, values);
          if (result.ok) {
            toast.success(t("admin.taxonomy.toast.created"));
            router.refresh();
          }
          return result;
        }}
        resetOnSuccess
        inline
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.taxonomy.name")}</TableHead>
              <TableHead>{t("admin.taxonomy.nameBn")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("common.products")}</TableHead>
              <TableHead className="w-48">
                <span className="sr-only">{t("common.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  {t("admin.taxonomy.empty")}
                </TableCell>
              </TableRow>
            ) : null}
            {order.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell lang="bn">{item.nameBn ?? ""}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t("admin.taxonomy.products", { count: item.productCount })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {reorderable ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${t("common.moveUp")}: ${item.name}`}
                          disabled={pending || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${t("common.moveDown")}: ${item.name}`}
                          disabled={pending || index === order.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDownIcon />
                        </Button>
                      </>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => setRenaming(item)}>
                      {t("common.rename")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.taxonomy.rename.title")}</DialogTitle>
            <DialogDescription>{renaming?.name}</DialogDescription>
          </DialogHeader>
          {renaming ? (
            <TaxonomyItemForm
              key={renaming.id}
              defaultValues={{ name: renaming.name, nameBn: renaming.nameBn ?? "" }}
              submitLabel={t("common.save")}
              onSubmit={async (values) => {
                const result = await updateTaxonomyItem(kind, renaming.id, values);
                if (result.ok) {
                  toast.success(t("admin.taxonomy.toast.saved"));
                  setRenaming(null);
                  router.refresh();
                }
                return result;
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("admin.taxonomy.delete.title", { name: deleting?.name ?? "" })}
        description={t(DELETE_KEY[kind], { count: deleting?.productCount ?? 0 })}
        confirmLabel={t("common.delete")}
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          const id = deleting.id;
          startTransition(async () => {
            const result = await deleteTaxonomyItem(kind, id);
            if (!result.ok) {
              toast.error(t(result.error));
              return;
            }
            toast.success(t("admin.taxonomy.toast.deleted"));
            setDeleting(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

type FormProps = {
  defaultValues?: TaxonomyItemInput;
  submitLabel: string;
  onSubmit: (
    values: TaxonomyItemInput,
  ) => Promise<
    | { ok: true }
    | { ok: false; error: MessageKey; fieldErrors?: Record<string, string[] | undefined> }
  >;
  resetOnSuccess?: boolean;
  inline?: boolean;
};

function TaxonomyItemForm({
  defaultValues = { name: "", nameBn: "" },
  submitLabel,
  onSubmit,
  resetOnSuccess = false,
  inline = false,
}: FormProps) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<TaxonomyItemInput>({
    resolver: zodResolver(taxonomyItemSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;
  const nameId = inline ? "new-name" : "rename-name";
  const nameBnId = inline ? "new-name-bn" : "rename-name-bn";

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await onSubmit(values);
    if (!result.ok) {
      setServerError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0])
          form.setError(field as keyof TaxonomyItemInput, { message: messages[0] });
      }
      return;
    }
    if (resetOnSuccess) form.reset({ name: "", nameBn: "" });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FieldGroup className={inline ? "md:flex-row md:items-start" : undefined}>
        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor={nameId}>{t("admin.taxonomy.name")}</FieldLabel>
          <Input
            id={nameId}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            {...form.register("name")}
          />
          <FieldMessage id={`${nameId}-error`} error={errors.name} />
        </Field>
        <Field data-invalid={!!errors.nameBn || undefined}>
          <FieldLabel htmlFor={nameBnId}>
            {t("admin.taxonomy.nameBn")}
            <BanglaBadge />
          </FieldLabel>
          <Input
            id={nameBnId}
            lang="bn"
            aria-invalid={!!errors.nameBn || undefined}
            aria-describedby={errors.nameBn ? `${nameBnId}-error` : undefined}
            {...form.register("nameBn")}
          />
          <FieldMessage id={`${nameBnId}-error`} error={errors.nameBn} />
        </Field>
        {inline ? (
          <div className="md:pt-[22px]">
            <SubmitButton pending={isSubmitting} pendingLabel={t("common.working")}>
              {submitLabel}
            </SubmitButton>
          </div>
        ) : null}
      </FieldGroup>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      {inline ? null : (
        <DialogFooter showCloseButton>
          <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
            {submitLabel}
          </SubmitButton>
        </DialogFooter>
      )}
    </form>
  );
}
