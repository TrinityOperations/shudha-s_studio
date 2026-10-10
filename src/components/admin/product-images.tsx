"use client";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVerticalIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  deleteProductImage,
  reorderProductImages,
  updateProductImageAlt,
  uploadProductImages,
} from "@/actions/product-images";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ProductImageRow } from "@/db/queries/products";
import { prepareImageForUpload } from "@/lib/client-image";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { productImageUrl } from "@/lib/storage";
import {
  imageAltSchema,
  isAllowedImageType,
  MAX_IMAGES_PER_UPLOAD,
  type ImageAltInput,
} from "@/lib/validators/product-images";

type PendingFile = { key: string; file: File; previewUrl: string; alt: string; altBn: string };

type Props = { productId: string; images: ProductImageRow[] };

/** OD-11: upload with required alt text, keyboard-accessible drag reorder, edit alt, delete. */
export function ProductImages({ productId, images }: Props) {
  const t = useT();
  const router = useRouter();
  const dndId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadState, setUploadState] = useState<"idle" | "preparing" | "uploading">("idle");
  const [uploadError, setUploadError] = useState<MessageKey | null>(null);
  const [items, setItems] = useState(images);
  const [prevImages, setPrevImages] = useState(images);
  const [editing, setEditing] = useState<ProductImageRow | null>(null);
  const [deleting, setDeleting] = useState<ProductImageRow | null>(null);
  const [actionPending, startTransition] = useTransition();

  if (images !== prevImages) {
    setPrevImages(images);
    setItems(images);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (!isAllowedImageType(file.type)) {
        toast.warning(t("admin.images.unsupported", { name: file.name }));
        continue;
      }
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        alt: "",
        altBn: "",
      });
    }
    setPendingFiles((prev) => [...prev, ...next].slice(0, MAX_IMAGES_PER_UPLOAD));
    if (fileInput.current) fileInput.current.value = "";
  }

  function removePending(key: string) {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  const canUpload =
    pendingFiles.length > 0 &&
    pendingFiles.every((p) => p.alt.trim().length > 0) &&
    uploadState === "idle";

  async function upload() {
    if (!canUpload) return;
    setUploadError(null);
    setUploadState("preparing");
    try {
      const prepared = await Promise.all(pendingFiles.map((p) => prepareImageForUpload(p.file)));
      setUploadState("uploading");
      const formData = new FormData();
      formData.set("productId", productId);
      prepared.forEach((file, index) => {
        formData.append("files", file);
        formData.append("alt", pendingFiles[index].alt.trim());
        formData.append("altBn", pendingFiles[index].altBn.trim());
      });
      const result = await uploadProductImages(formData);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingFiles([]);
      toast.success(t("admin.images.toast.uploaded", { count: result.data.uploaded }));
      router.refresh();
    } catch {
      setUploadError("errors.uploadFailed");
    } finally {
      setUploadState("idle");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(items, from, to);
    setItems(next);
    startTransition(async () => {
      const result = await reorderProductImages({ productId, ids: next.map((i) => i.id) });
      if (!result.ok) {
        toast.error(t(result.error));
        setItems(images);
        return;
      }
      toast.success(t("admin.images.toast.reordered"));
      router.refresh();
    });
  }

  return (
    <section className="space-y-6" aria-labelledby="images-heading">
      <header className="space-y-1">
        <h2 id="images-heading" className="text-xl font-semibold tracking-tight">
          {t("admin.images.title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("admin.images.hint")}</p>
      </header>

      <div className="space-y-4 rounded-lg border p-4">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          id="image-files"
          onChange={(event) => addFiles(event.target.files)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            {t("admin.images.choose")}
          </Button>
          {pendingFiles.length > 0 ? (
            <span className="text-muted-foreground text-sm">
              {t("admin.images.selected", { count: pendingFiles.length })}
            </span>
          ) : null}
        </div>

        {pendingFiles.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {pendingFiles.map((pending, index) => (
              <li key={pending.key} className="flex gap-3 rounded-md border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img
                  src={pending.previewUrl}
                  alt=""
                  className="size-20 shrink-0 rounded object-cover"
                />
                <FieldGroup className="gap-2">
                  <Field>
                    <FieldLabel htmlFor={`alt-${pending.key}`}>{t("admin.images.alt")}</FieldLabel>
                    <Input
                      id={`alt-${pending.key}`}
                      required
                      value={pending.alt}
                      onChange={(event) =>
                        setPendingFiles((prev) =>
                          prev.map((p, i) => (i === index ? { ...p, alt: event.target.value } : p)),
                        )
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`altbn-${pending.key}`}>
                      {t("admin.images.altBn")}
                      <BanglaBadge />
                    </FieldLabel>
                    <Input
                      id={`altbn-${pending.key}`}
                      lang="bn"
                      value={pending.altBn}
                      onChange={(event) =>
                        setPendingFiles((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, altBn: event.target.value } : p,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => removePending(pending.key)}
                  >
                    {t("admin.images.remove")}
                  </Button>
                </FieldGroup>
              </li>
            ))}
          </ul>
        ) : null}

        {uploadError ? <FieldError>{t(uploadError)}</FieldError> : null}

        {pendingFiles.length > 0 ? (
          <Button
            type="button"
            disabled={!canUpload}
            aria-busy={uploadState !== "idle"}
            onClick={upload}
          >
            {uploadState === "preparing"
              ? t("admin.images.preparing")
              : uploadState === "uploading"
                ? t("common.uploading")
                : t("common.upload")}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("admin.images.empty")}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">{t("admin.images.reorderHint")}</p>
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {items.map((image) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    disabled={actionPending}
                    onEdit={() => setEditing(image)}
                    onDelete={() => setDeleting(image)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.images.editAlt")}</DialogTitle>
            <DialogDescription>{editing?.alt}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <EditAltForm
              key={editing.id}
              image={editing}
              onSaved={() => {
                setEditing(null);
                router.refresh();
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
        title={t("admin.images.delete.title")}
        description={t("admin.images.delete.description")}
        confirmLabel={t("common.delete")}
        destructive
        pending={actionPending}
        onConfirm={() => {
          if (!deleting) return;
          const id = deleting.id;
          startTransition(async () => {
            const result = await deleteProductImage(id);
            if (!result.ok) {
              toast.error(t(result.error));
              return;
            }
            toast.success(t("admin.images.toast.deleted"));
            setDeleting(null);
            router.refresh();
          });
        }}
      />
    </section>
  );
}

function SortableImage({
  image,
  disabled,
  onEdit,
  onDelete,
}: {
  image: ProductImageRow;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-background flex flex-col gap-2 rounded-lg border p-2 ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      <div className="relative">
        <Image
          src={productImageUrl(image.thumbPath)}
          alt={image.alt}
          width={400}
          height={400}
          sizes="(min-width: 1024px) 200px, (min-width: 768px) 30vw, 45vw"
          className="aspect-square w-full rounded-md object-cover"
        />
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 absolute top-1 left-1 cursor-grab active:cursor-grabbing"
          aria-label={t("admin.images.dragHandle", { alt: image.alt })}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
      </div>
      <p className="text-muted-foreground truncate text-xs" title={image.alt}>
        {image.alt}
      </p>
      <div className="flex gap-1">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          {t("admin.images.editAlt")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          {t("common.delete")}
        </Button>
      </div>
    </li>
  );
}

function EditAltForm({ image, onSaved }: { image: ProductImageRow; onSaved: () => void }) {
  const t = useT();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const form = useForm<ImageAltInput>({
    resolver: zodResolver(imageAltSchema),
    defaultValues: { alt: image.alt, altBn: image.altBn ?? "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await updateProductImageAlt(image.id, values);
    if (!result.ok) {
      setServerError(result.error);
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) form.setError(name as keyof ImageAltInput, { message: messages[0] });
      }
      return;
    }
    toast.success(t("admin.images.toast.altSaved"));
    onSaved();
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FieldGroup>
        <Field data-invalid={!!errors.alt || undefined}>
          <FieldLabel htmlFor="edit-alt">{t("admin.images.alt")}</FieldLabel>
          <Input
            id="edit-alt"
            aria-invalid={!!errors.alt || undefined}
            aria-describedby={errors.alt ? "edit-alt-error" : undefined}
            {...form.register("alt")}
          />
          <FieldMessage id="edit-alt-error" error={errors.alt} />
        </Field>
        <Field data-invalid={!!errors.altBn || undefined}>
          <FieldLabel htmlFor="edit-alt-bn">
            {t("admin.images.altBn")}
            <BanglaBadge />
          </FieldLabel>
          <Input id="edit-alt-bn" lang="bn" {...form.register("altBn")} />
          <FieldDescription>{t("admin.settings.taglineBnHint")}</FieldDescription>
          <FieldMessage error={errors.altBn} />
        </Field>
      </FieldGroup>
      {serverError ? <FieldError>{t(serverError)}</FieldError> : null}
      <DialogFooter showCloseButton>
        <SubmitButton pending={isSubmitting} pendingLabel={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
