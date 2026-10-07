import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { productViewStats } from "@/db/schema";
import { formatMelbourne } from "@/lib/time";

const BOT_USER_AGENT = /bot|crawl|spider|slurp|preview/i;

/**
 * Counts one view of a published product for today's Melbourne date (OD-40). Not a server action
 * on purpose (DECISIONS.md 2026-10-08): it is called from the product page via `after()` so it
 * never delays the response, and must never be reachable from the client. Bots are skipped.
 */
export async function recordProductView(
  productId: string,
  userAgent: string | null,
): Promise<void> {
  if (userAgent && BOT_USER_AGENT.test(userAgent)) return;
  const day = formatMelbourne(new Date(), "yyyy-MM-dd");
  await db
    .insert(productViewStats)
    .values({ productId, day, views: 1 })
    .onConflictDoUpdate({
      target: [productViewStats.productId, productViewStats.day],
      set: { views: sql`${productViewStats.views} + 1` },
    });
}
