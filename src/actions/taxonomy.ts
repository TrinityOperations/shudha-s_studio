"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories, occasions, tags } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import {
  reorderTaxonomySchema,
  taxonomyIdSchema,
  taxonomyItemSchema,
  taxonomyKindSchema,
  type ReorderTaxonomyInput,
  type SortableTaxonomyKind,
  type TaxonomyItemInput,
  type TaxonomyKind,
} from "@/lib/validators/taxonomy";

export type TaxonomyItem = { id: string; slug: string; name: string; nameBn: string | null };

function sortableTable(kind: SortableTaxonomyKind) {
  return kind === "category" ? categories : occasions;
}

function revalidateTaxonomy() {
  revalidatePath("/", "layout");
}

/** OD-12. Also used inline from the product form to add a tag. Returns the new row. */
export async function createTaxonomyItem(
  kind: TaxonomyKind,
  input: TaxonomyItemInput,
): Promise<ActionResult<TaxonomyItem>> {
  const parsedKind = taxonomyKindSchema.safeParse(kind);
  const parsed = taxonomyItemSchema.safeParse(input);
  if (!parsedKind.success) return fail("errors.invalidInput");
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const { name, nameBn } = parsed.data;
  const values = { name, nameBn: nameBn || null };

  let row: TaxonomyItem;
  if (parsedKind.data === "tag") {
    const slug = await ensureUniqueSlug(tags, slugify(name) || "tag");
    [row] = await db
      .insert(tags)
      .values({ ...values, slug })
      .returning({ id: tags.id, slug: tags.slug, name: tags.name, nameBn: tags.nameBn });
  } else {
    const table = sortableTable(parsedKind.data);
    const slug = await ensureUniqueSlug(table, slugify(name) || parsedKind.data);
    const [{ maxSort }] = await db.select({ maxSort: max(table.sortOrder) }).from(table);
    [row] = await db
      .insert(table)
      .values({ ...values, slug, sortOrder: (maxSort ?? -1) + 1 })
      .returning({ id: table.id, slug: table.slug, name: table.name, nameBn: table.nameBn });
  }

  revalidateTaxonomy();
  return ok(row);
}

/** Rename (English and Bengali). The slug is kept so public URLs stay stable. */
export async function updateTaxonomyItem(
  kind: TaxonomyKind,
  id: string,
  input: TaxonomyItemInput,
): Promise<ActionResult<TaxonomyItem>> {
  const parsedKind = taxonomyKindSchema.safeParse(kind);
  const parsedId = taxonomyIdSchema.safeParse(id);
  const parsed = taxonomyItemSchema.safeParse(input);
  if (!parsedKind.success || !parsedId.success) return fail("errors.invalidInput");
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const values = { name: parsed.data.name, nameBn: parsed.data.nameBn || null };

  const table = parsedKind.data === "tag" ? tags : sortableTable(parsedKind.data);
  const rows = await db
    .update(table)
    .set(values)
    .where(eq(table.id, parsedId.data))
    .returning({ id: table.id, slug: table.slug, name: table.name, nameBn: table.nameBn });
  if (rows.length === 0) return fail("errors.notFound");

  revalidateTaxonomy();
  return ok(rows[0]);
}

/** Categories: products become uncategorised (FK set null). Occasions/tags: join rows cascade. */
export async function deleteTaxonomyItem(kind: TaxonomyKind, id: string): Promise<ActionResult> {
  const parsedKind = taxonomyKindSchema.safeParse(kind);
  const parsedId = taxonomyIdSchema.safeParse(id);
  if (!parsedKind.success || !parsedId.success) return fail("errors.invalidInput");
  await requireOwner();

  const table = parsedKind.data === "tag" ? tags : sortableTable(parsedKind.data);
  const rows = await db
    .delete(table)
    .where(eq(table.id, parsedId.data))
    .returning({ id: table.id });
  if (rows.length === 0) return fail("errors.notFound");

  revalidateTaxonomy();
  return ok();
}

/** `ids` must be exactly the existing rows of that kind in the new order. */
export async function reorderTaxonomy(input: ReorderTaxonomyInput): Promise<ActionResult> {
  const parsed = reorderTaxonomySchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();
  const { kind, ids } = parsed.data;
  const table = sortableTable(kind);

  const existing = await db.select({ id: table.id }).from(table);
  const existingIds = new Set(existing.map((r) => r.id));
  if (ids.length !== existingIds.size || !ids.every((id) => existingIds.has(id))) {
    return fail("errors.invalidInput");
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(table).set({ sortOrder: index }).where(eq(table.id, id));
    }
  });

  revalidateTaxonomy();
  return ok();
}
