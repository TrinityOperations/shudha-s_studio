import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { faqs, type Faq } from "@/db/schema";

/** PW-43: the published questions in the owner's order. */
export async function listPublishedFaqs(): Promise<Faq[]> {
  return db.query.faqs.findMany({
    where: eq(faqs.published, true),
    orderBy: [asc(faqs.sortOrder), asc(faqs.createdAt)],
  });
}

/** OD-30: every question, hidden ones included, for the dashboard. */
export async function listAllFaqs(): Promise<Faq[]> {
  return db.query.faqs.findMany({ orderBy: [asc(faqs.sortOrder), asc(faqs.createdAt)] });
}
