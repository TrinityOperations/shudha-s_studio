"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { faqs, type Faq } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireOwner } from "@/lib/auth";
import { faqIdSchema, faqSchema, reorderFaqsSchema, type FaqValues } from "@/lib/validators/faqs";

function revalidateFaqs() {
  revalidatePath("/faq");
  revalidatePath("/admin/settings/faqs");
}

/** OD-30: a new question goes to the end of the list. */
export async function createFaq(input: FaqValues): Promise<ActionResult<Faq>> {
  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${faqs.sortOrder}), -1) + 1` })
    .from(faqs);
  const [row] = await db
    .insert(faqs)
    .values({ ...toColumns(parsed.data), sortOrder: Number(next) })
    .returning();
  revalidateFaqs();
  return ok(row);
}

export async function updateFaq(id: string, input: FaqValues): Promise<ActionResult<Faq>> {
  const parsedId = faqIdSchema.safeParse(id);
  const parsed = faqSchema.safeParse(input);
  if (!parsedId.success) return fail("errors.invalidInput");
  if (!parsed.success) {
    return fail("errors.invalidInput", z.flattenError(parsed.error).fieldErrors);
  }
  await requireOwner();
  const [row] = await db
    .update(faqs)
    .set({ ...toColumns(parsed.data), updatedAt: new Date() })
    .where(eq(faqs.id, parsedId.data))
    .returning();
  if (!row) return fail("errors.notFound");
  revalidateFaqs();
  return ok(row);
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  const parsedId = faqIdSchema.safeParse(id);
  if (!parsedId.success) return fail("errors.invalidInput");
  await requireOwner();
  await db.delete(faqs).where(eq(faqs.id, parsedId.data));
  revalidateFaqs();
  return ok();
}

/** The ids in their new order; anything not listed keeps its place after them. */
export async function reorderFaqs(input: { ids: string[] }): Promise<ActionResult> {
  const parsed = reorderFaqsSchema.safeParse(input);
  if (!parsed.success) return fail("errors.invalidInput");
  await requireOwner();
  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx.update(faqs).set({ sortOrder: index }).where(eq(faqs.id, id));
    }
  });
  revalidateFaqs();
  return ok();
}

function toColumns(values: FaqValues) {
  return {
    question: values.question,
    questionBn: values.questionBn || null,
    answer: values.answer,
    answerBn: values.answerBn || null,
    published: values.published,
  };
}
