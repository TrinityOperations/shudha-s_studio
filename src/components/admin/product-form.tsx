"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createProduct, unarchiveProduct, updateProduct } from "@/actions/products";
import { createTaxonomyItem } from "@/actions/taxonomy";
import { BanglaBadge } from "@/components/shared/bangla-badge";
import { FieldMessage } from "@/components/shared/field-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ProductStatus } from "@/db/schema";
import { useLocale, useT } from "@/lib/i18n/client";
import { localised } from "@/lib/i18n/localised";
import type { MessageKey } from "@/lib/i18n/t";
import { slugify } from "@/lib/slugify";
import { formatMelbourne } from "@/lib/time";
import {
  PERSONALISATION_OPTIONS,
  PRICE_FROM_MAX,
  productSchema,
  type ProductFormValues,
  type ProductInput,
} from "@/lib/validators/products";

export type TaxonomyOption = { id: string; name: string; nameBn: string | null };
export type ProductFormTaxonomy = {
  categories: TaxonomyOption[];
  occasions: TaxonomyOption[];
  tags: TaxonomyOption[];
};

type Props =
  | { mode: "create"; defaultValues: ProductFormValues; taxonomy: ProductFormTaxonomy }
  | {
      /** Inside the home page editor's panel: the panel owns the photo and calls the action. */
      mode: "editor";
      defaultValues: ProductFormValues;
      taxonomy: ProductFormTaxonomy;
      photoUrl: string;
      onValuesChange: (values: ProductFormValues) => void;
      /** Resolves true when the product was saved (published and placed, or kept as a draft). */
      onSubmit: (values: ProductFormValues, publish: boolean) => Promise<boolean>;
      onCancel: () => void;
    }
  | {
      mode: "edit";
      productId: string;
      status: ProductStatus;
      publishedAt: string | null;
      defaultValues: ProductFormValues;
      taxonomy: ProductFormTaxonomy;
    };

const NONE = "none";

export function ProductForm(props: Props) {
  const { mode, defaultValues, taxonomy } = props;
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const [tags, setTags] = useState(taxonomy.tags);
  const [newTag, setNewTag] = useState("");
  const [tagPending, startTagTransition] = useTransition();
  const [unarchivePending, startUnarchive] = useTransition();
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [publishIntent, setPublishIntent] = useState(true);
  const archived = mode === "edit" && props.status === "archived";

  const form = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  // The editor's panel keeps the typed values so a mid-form close can save them as a draft.
  const onValuesChange = mode === "editor" ? props.onValuesChange : null;
  const watched = useWatch({ control: form.control });
  useEffect(() => {
    onValuesChange?.(watched as ProductFormValues);
  }, [watched, onValuesChange]);

  const label = (option: TaxonomyOption) => localised(locale, option.name, option.nameBn);

  function applyFailure(result: {
    error: MessageKey;
    fieldErrors?: Record<string, string[] | undefined>;
  }) {
    setServerError(result.error);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (messages?.[0]) form.setError(name as keyof ProductFormValues, { message: messages[0] });
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    if (mode === "editor") {
      await props.onSubmit(values, publishIntent);
      return;
    }
    if (mode === "create") {
      // Redirects to the edit page on success and resolves to nothing here.
      const result = await createProduct(values);
      if (result && !result.ok) applyFailure(result);
      return;
    }
    const result = await updateProduct(props.productId, values);
    if (!result.ok) {
      applyFailure(result);
      return;
    }
    form.reset({ ...values, slug: result.data.slug });
    toast.success(t("admin.products.toast.saved"));
    router.refresh();
  });

  function addTag() {
    const name = newTag.trim();
    if (!name) return;
    startTagTransition(async () => {
      const result = await createTaxonomyItem("tag", { name, nameBn: "" });
      if (!result.ok) {
        toast.error(t(result.error));
        return;
      }
      setTags((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      form.setValue("tagIds", [...form.getValues("tagIds"), result.data.id], {
        shouldDirty: true,
      });
      setNewTag("");
    });
  }

  const categoryItems = [
    { value: NONE, label: t("common.none") },
    ...taxonomy.categories.map((c) => ({ value: c.id, label: label(c) })),
  ];
  const statusItems = [
    { value: "draft", label: t("status.draft") },
    { value: "published", label: t("status.published") },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {archived ? (
        <div
          role="status"
          className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"
        >
          <span>
            <Badge variant="outline" className="mr-2">
              {t("status.archived")}
            </Badge>
            {t("admin.products.form.archivedNotice")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unarchivePending}
            onClick={() =>
              startUnarchive(async () => {
                const result = await unarchiveProduct(props.productId);
                if (!result.ok) {
                  toast.error(t(result.error));
                  return;
                }
                toast.success(t("admin.products.toast.unarchived"));
                router.refresh();
              })
            }
          >
            {t("common.unarchive")}
          </Button>
        </div>
      ) : null}

      <fieldset disabled={archived} className="space-y-8">
        <FieldGroup>
          <Field data-invalid={!!errors.title || undefined}>
            <FieldLabel htmlFor="title">{t("admin.products.form.title")}</FieldLabel>
            <Input
              id="title"
              aria-invalid={!!errors.title || undefined}
              aria-describedby={errors.title ? "title-error" : undefined}
              {...form.register("title", {
                onChange: (event) => {
                  if (!slugTouched) {
                    form.setValue("slug", slugify(event.target.value), { shouldValidate: false });
                  }
                },
              })}
            />
            <FieldMessage id="title-error" error={errors.title} />
          </Field>

          <Field data-invalid={!!errors.titleBn || undefined}>
            <FieldLabel htmlFor="titleBn">
              {t("admin.products.form.titleBn")}
              <BanglaBadge />
            </FieldLabel>
            <Input id="titleBn" lang="bn" {...form.register("titleBn")} />
            <FieldMessage error={errors.titleBn} />
          </Field>

          <Field data-invalid={!!errors.slug || undefined}>
            <FieldLabel htmlFor="slug">{t("admin.products.form.slug")}</FieldLabel>
            <Input
              id="slug"
              aria-invalid={!!errors.slug || undefined}
              aria-describedby="slug-hint"
              {...form.register("slug", {
                onChange: () => {
                  setSlugTouched(true);
                },
              })}
            />
            <FieldDescription id="slug-hint">{t("admin.products.form.slugHint")}</FieldDescription>
            <FieldMessage error={errors.slug} />
          </Field>

          <Field data-invalid={!!errors.description || undefined}>
            <FieldLabel htmlFor="description">{t("admin.products.form.description")}</FieldLabel>
            <Textarea id="description" rows={5} {...form.register("description")} />
            <FieldMessage error={errors.description} />
          </Field>

          <Field data-invalid={!!errors.descriptionBn || undefined}>
            <FieldLabel htmlFor="descriptionBn">
              {t("admin.products.form.descriptionBn")}
              <BanglaBadge />
            </FieldLabel>
            <Textarea id="descriptionBn" lang="bn" rows={5} {...form.register("descriptionBn")} />
            <FieldMessage error={errors.descriptionBn} />
          </Field>

          <Field data-invalid={!!errors.materialNotes || undefined}>
            <FieldLabel htmlFor="materialNotes">
              {t("admin.products.form.materialNotes")}
            </FieldLabel>
            <Textarea id="materialNotes" rows={3} {...form.register("materialNotes")} />
            <FieldMessage error={errors.materialNotes} />
          </Field>

          <Field data-invalid={!!errors.materialNotesBn || undefined}>
            <FieldLabel htmlFor="materialNotesBn">
              {t("admin.products.form.materialNotesBn")}
              <BanglaBadge />
            </FieldLabel>
            <Textarea
              id="materialNotesBn"
              lang="bn"
              rows={3}
              {...form.register("materialNotesBn")}
            />
            <FieldMessage error={errors.materialNotesBn} />
          </Field>

          <Field data-invalid={!!errors.turnaroundDays || undefined} className="max-w-xs">
            <FieldLabel htmlFor="turnaroundDays">
              {t("admin.products.form.turnaroundDays")}
            </FieldLabel>
            <Input
              id="turnaroundDays"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              aria-invalid={!!errors.turnaroundDays || undefined}
              {...form.register("turnaroundDays", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined ? null : Number(value),
              })}
            />
            <FieldMessage error={errors.turnaroundDays} />
          </Field>

          <Field data-invalid={!!errors.priceFrom || undefined} className="max-w-xs">
            <FieldLabel htmlFor="priceFrom">{t("admin.products.form.priceFrom")}</FieldLabel>
            <Input
              id="priceFrom"
              type="number"
              inputMode="numeric"
              min={1}
              max={PRICE_FROM_MAX}
              step={1}
              aria-invalid={!!errors.priceFrom || undefined}
              aria-describedby="priceFrom-hint"
              {...form.register("priceFrom", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined ? null : Number(value),
              })}
            />
            <FieldDescription id="priceFrom-hint">
              {t("admin.products.form.priceFromHint")}
            </FieldDescription>
            <FieldMessage error={errors.priceFrom} />
          </Field>

          <Field data-invalid={!!errors.videoUrl || undefined}>
            <FieldLabel htmlFor="videoUrl">{t("admin.products.form.videoUrl")}</FieldLabel>
            <Input
              id="videoUrl"
              type="url"
              inputMode="url"
              aria-invalid={!!errors.videoUrl || undefined}
              aria-describedby="videoUrl-hint"
              {...form.register("videoUrl")}
            />
            <FieldDescription id="videoUrl-hint">
              {t("admin.products.form.videoUrlHint")}
            </FieldDescription>
            <FieldMessage error={errors.videoUrl} />
          </Field>

          <Field data-invalid={!!errors.categoryId || undefined} className="max-w-xs">
            <FieldLabel htmlFor="categoryId">{t("admin.products.form.category")}</FieldLabel>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  items={categoryItems}
                  value={field.value ?? NONE}
                  onValueChange={(value) => field.onChange(value && value !== NONE ? value : null)}
                >
                  <SelectTrigger id="categoryId" onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldMessage error={errors.categoryId} />
          </Field>
        </FieldGroup>

        <Controller
          control={form.control}
          name="occasionIds"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>{t("admin.products.form.occasions")}</FieldLegend>
              <FieldGroup className="gap-2">
                {taxonomy.occasions.map((occasion) => (
                  <Field key={occasion.id} orientation="horizontal">
                    <Checkbox
                      id={`occasion-${occasion.id}`}
                      checked={field.value.includes(occasion.id)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, occasion.id]
                            : field.value.filter((id) => id !== occasion.id),
                        )
                      }
                    />
                    <FieldLabel htmlFor={`occasion-${occasion.id}`} className="font-normal">
                      {label(occasion)}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          )}
        />

        <Controller
          control={form.control}
          name="tagIds"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>{t("admin.products.form.tags")}</FieldLegend>
              <FieldGroup className="gap-2">
                {tags.map((tag) => (
                  <Field key={tag.id} orientation="horizontal">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={field.value.includes(tag.id)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, tag.id]
                            : field.value.filter((id) => id !== tag.id),
                        )
                      }
                    />
                    <FieldLabel htmlFor={`tag-${tag.id}`} className="font-normal">
                      {label(tag)}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
              <div className="flex max-w-md items-end gap-2">
                <Field>
                  <FieldLabel htmlFor="newTag">{t("admin.products.form.newTag")}</FieldLabel>
                  <Input
                    id="newTag"
                    value={newTag}
                    onChange={(event) => setNewTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  disabled={tagPending || !newTag.trim()}
                  onClick={addTag}
                >
                  {t("admin.products.form.addTag")}
                </Button>
              </div>
            </FieldSet>
          )}
        />

        <Controller
          control={form.control}
          name="personalisationOptions"
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>{t("admin.products.form.personalisation")}</FieldLegend>
              <FieldDescription>{t("admin.products.form.personalisationHint")}</FieldDescription>
              <FieldGroup className="gap-2">
                {PERSONALISATION_OPTIONS.map((option) => (
                  <Field key={option} orientation="horizontal">
                    <Checkbox
                      id={`personalisation-${option}`}
                      checked={field.value.includes(option)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, option]
                            : field.value.filter((o) => o !== option),
                        )
                      }
                    />
                    <FieldLabel htmlFor={`personalisation-${option}`} className="font-normal">
                      {t(`personalisation.${option}` as MessageKey)}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          )}
        />

        <FieldGroup>
          <Field data-invalid={!!errors.personalisationNotes || undefined}>
            <FieldLabel htmlFor="personalisationNotes">
              {t("admin.products.form.personalisationNotes")}
            </FieldLabel>
            <Textarea
              id="personalisationNotes"
              rows={3}
              {...form.register("personalisationNotes")}
            />
            <FieldMessage error={errors.personalisationNotes} />
          </Field>
          <Field data-invalid={!!errors.personalisationNotesBn || undefined}>
            <FieldLabel htmlFor="personalisationNotesBn">
              {t("admin.products.form.personalisationNotesBn")}
              <BanglaBadge />
            </FieldLabel>
            <Textarea
              id="personalisationNotesBn"
              lang="bn"
              rows={3}
              {...form.register("personalisationNotesBn")}
            />
            <FieldMessage error={errors.personalisationNotesBn} />
          </Field>

          <Controller
            control={form.control}
            name="featured"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch
                  id="featured"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
                <FieldLabel htmlFor="featured" className="font-normal">
                  {t("admin.products.form.featured")}
                </FieldLabel>
              </Field>
            )}
          />

          {mode === "edit" ? (
            <Field className="max-w-xs">
              <FieldLabel htmlFor="status">{t("admin.products.form.status")}</FieldLabel>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    items={statusItems}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "draft")}
                  >
                    <SelectTrigger id="status" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {props.publishedAt ? (
                <FieldDescription>
                  {t("admin.products.form.publishedAt", {
                    date: formatMelbourne(props.publishedAt, "d MMM yyyy"),
                  })}
                </FieldDescription>
              ) : null}
            </Field>
          ) : (
            <FieldDescription>{t("admin.products.form.createHint")}</FieldDescription>
          )}
        </FieldGroup>

        {serverError ? <FieldError>{t(serverError)}</FieldError> : null}

        {mode === "editor" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting && publishIntent}
              onClick={() => setPublishIntent(true)}
            >
              {isSubmitting && publishIntent
                ? t("common.saving")
                : t("admin.editor.panel.savePlace")}
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setPublishIntent(false)}
            >
              {t("admin.editor.panel.saveDraft")}
            </Button>
            <Button type="button" variant="ghost" onClick={props.onCancel} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton
              pending={isSubmitting}
              pendingLabel={mode === "create" ? t("common.working") : t("common.saving")}
            >
              {mode === "create" ? t("admin.products.form.create") : t("admin.products.form.save")}
            </SubmitButton>
            <Link href="/admin/products" className={buttonVariants({ variant: "ghost" })}>
              {t("admin.products.backToList")}
            </Link>
          </div>
        )}
      </fieldset>
    </form>
  );
}
