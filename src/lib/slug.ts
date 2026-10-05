import { eq, like, or } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db, type Db } from "@/db";

export { slugify } from "./slugify";

export type SlugTable = PgTable & { id: AnyPgColumn; slug: AnyPgColumn };
export type SlugExecutor = Pick<Db, "select">;

/**
 * Returns `base` if free, otherwise `base-2`, `base-3`, … Rows with `excludeId` are ignored so a
 * product keeps its own slug on update. Pass the transaction as `executor` when inside one.
 */
export async function ensureUniqueSlug(
  table: SlugTable,
  base: string,
  excludeId?: string,
  executor: SlugExecutor = db,
): Promise<string> {
  const root = base || "item";
  const rows = (await executor
    .select({ id: table.id, slug: table.slug })
    .from(table)
    .where(or(eq(table.slug, root), like(table.slug, `${root}-%`)))) as {
    id: string;
    slug: string;
  }[];

  const taken = new Set(rows.filter((row) => row.id !== excludeId).map((row) => row.slug));
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
