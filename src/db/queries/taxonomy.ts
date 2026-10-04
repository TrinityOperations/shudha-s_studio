import "server-only";
import { asc, count, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  occasions,
  productOccasions,
  products,
  productTags,
  tags,
  type Category,
  type Occasion,
  type Tag,
} from "@/db/schema";

export type CategoryWithCount = Category & { productCount: number };
export type OccasionWithCount = Occasion & { productCount: number };
export type TagWithCount = Tag & { productCount: number };

export async function listCategories(): Promise<CategoryWithCount[]> {
  return db
    .select({ ...getTableColumns(categories), productCount: count(products.id) })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listOccasions(): Promise<OccasionWithCount[]> {
  return db
    .select({ ...getTableColumns(occasions), productCount: count(productOccasions.productId) })
    .from(occasions)
    .leftJoin(productOccasions, eq(productOccasions.occasionId, occasions.id))
    .groupBy(occasions.id)
    .orderBy(asc(occasions.sortOrder), asc(occasions.name));
}

export async function listTags(): Promise<TagWithCount[]> {
  return db
    .select({ ...getTableColumns(tags), productCount: count(productTags.productId) })
    .from(tags)
    .leftJoin(productTags, eq(productTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));
}

export type TaxonomyLists = {
  categories: CategoryWithCount[];
  occasions: OccasionWithCount[];
  tags: TagWithCount[];
};

export async function listTaxonomy(): Promise<TaxonomyLists> {
  const [c, o, t] = await Promise.all([listCategories(), listOccasions(), listTags()]);
  return { categories: c, occasions: o, tags: t };
}
