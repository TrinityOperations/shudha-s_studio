"use client";
import { MoreHorizontalIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveProduct,
  bulkUpdateProducts,
  deleteProduct,
  duplicateProduct,
  unarchiveProduct,
} from "@/actions/products";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductListRow } from "@/db/queries/products";
import type { ActionResult } from "@/lib/action-result";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { productImageUrl } from "@/lib/storage";
import { formatMelbourne } from "@/lib/time";
import type { BulkProductAction } from "@/lib/validators/products";

const STATUS_VARIANT = {
  draft: "secondary",
  published: "default",
  archived: "outline",
} as const;

export function ProductTable({ rows }: { rows: ProductListRow[] }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ProductListRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const visibleIds = rows.map((r) => r.id);
  const selectedVisible = visibleIds.filter((id) => selected.has(id));
  const allSelected = rows.length > 0 && selectedVisible.length === rows.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;

  function run<T>(action: () => Promise<ActionResult<T> | void>, successKey: MessageKey) {
    startTransition(async () => {
      const result = await action();
      // Redirecting actions (duplicate) resolve to nothing; the router has already moved on.
      if (!result) return;
      if (!result.ok) {
        toast.error(t(result.error));
        return;
      }
      toast.success(
        t(successKey, { count: (result.data as { count?: number } | undefined)?.count ?? 0 }),
      );
      router.refresh();
    });
  }

  function runBulk(action: BulkProductAction) {
    const ids = [...selectedVisible];
    startTransition(async () => {
      const result = await bulkUpdateProducts({ ids, action });
      if (!result.ok) {
        toast.error(t(result.error));
        return;
      }
      toast.success(t("admin.products.toast.bulk", { count: result.data.count }));
      setSelected(new Set());
      setBulkDeleteOpen(false);
      router.refresh();
    });
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function name(row: ProductListRow) {
    return locale === "bn" && row.titleBn ? row.titleBn : row.title;
  }

  return (
    <div className="space-y-3">
      {selectedVisible.length > 0 ? (
        <div
          role="region"
          aria-label={t("common.actions")}
          className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <span className="font-medium">
            {t("admin.products.selected", { count: selectedVisible.length })}
          </span>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk("publish")}>
            {t("common.publish")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runBulk("unpublish")}
          >
            {t("common.unpublish")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk("archive")}>
            {t("common.archive")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => setBulkDeleteOpen(true)}
          >
            {t("common.delete")}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label={t("admin.products.selectAll")}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked ? new Set(visibleIds) : new Set())
                  }
                />
              </TableHead>
              <TableHead className="w-16">{t("admin.products.col.image")}</TableHead>
              <TableHead>{t("admin.products.col.title")}</TableHead>
              <TableHead>{t("admin.products.col.category")}</TableHead>
              <TableHead>{t("admin.products.col.status")}</TableHead>
              <TableHead>{t("admin.products.col.featured")}</TableHead>
              <TableHead>{t("admin.products.col.updated")}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t("common.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                  {t("admin.products.noResults")}
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => (
              <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={t("admin.products.selectOne", { title: name(row) })}
                    checked={selected.has(row.id)}
                    onCheckedChange={(checked) => toggle(row.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  {row.thumb ? (
                    <Image
                      src={productImageUrl(row.thumb.thumbPath)}
                      alt={row.thumb.alt}
                      width={48}
                      height={48}
                      className="size-12 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-md text-[10px]"
                      aria-label={t("admin.products.noImage")}
                    >
                      —
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <a
                    href={`/admin/products/${row.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </a>
                  {row.titleBn ? (
                    <div className="text-muted-foreground text-xs" lang="bn">
                      {row.titleBn}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {row.category
                    ? locale === "bn" && row.category.nameBn
                      ? row.category.nameBn
                      : row.category.name
                    : t("admin.products.uncategorised")}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status]}>{t(`status.${row.status}`)}</Badge>
                </TableCell>
                <TableCell>
                  {row.featured ? (
                    <Badge variant="outline">{t("admin.products.featuredYes")}</Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatMelbourne(row.updatedAt, "d MMM yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("admin.products.rowActions", { title: name(row) })}
                        />
                      }
                    >
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/admin/products/${row.id}`)}>
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={pending}
                        onClick={() =>
                          run(() => duplicateProduct(row.id), "admin.products.toast.saved")
                        }
                      >
                        {t("common.duplicate")}
                      </DropdownMenuItem>
                      {row.status === "archived" ? (
                        <DropdownMenuItem
                          disabled={pending}
                          onClick={() =>
                            run(() => unarchiveProduct(row.id), "admin.products.toast.unarchived")
                          }
                        >
                          {t("common.unarchive")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled={pending}
                          onClick={() =>
                            run(() => archiveProduct(row.id), "admin.products.toast.archived")
                          }
                        >
                          {t("common.archive")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={pending}
                        onClick={() => setDeleteTarget(row)}
                      >
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("admin.products.delete.title")}
        description={
          deleteTarget ? (
            <>
              <p>{t("admin.products.delete.description", { title: deleteTarget.title })}</p>
              {deleteTarget.bookingCount > 0 ? (
                <p className="mt-2">
                  {t("admin.products.delete.bookings", { count: deleteTarget.bookingCount })}
                </p>
              ) : null}
            </>
          ) : null
        }
        confirmLabel={t("common.delete")}
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          run(async () => {
            const result = await deleteProduct(id);
            if (result.ok) setDeleteTarget(null);
            return result;
          }, "admin.products.toast.deleted");
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t("admin.products.bulkDelete.title", { count: selectedVisible.length })}
        description={t("admin.products.bulkDelete.description")}
        confirmLabel={t("common.delete")}
        destructive
        pending={pending}
        onConfirm={() => runBulk("delete")}
      />
    </div>
  );
}
