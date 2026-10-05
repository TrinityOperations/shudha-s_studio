import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import {
  categories,
  occasions,
  productImages,
  products,
  productViewStats,
  tags,
  type Personalisation,
} from "@/db/schema";
import { MELBOURNE_TZ } from "@/lib/time";
import { CATALOGUE_PAGE_SIZE, type ParsedCatalogueSearchParams } from "@/lib/validators/catalogue";

export type CatalogueTaxonomyItem = {
  slug: string;
  name: string;
  nameBn: string | null;
};

export type CatalogueTaxonomy = {
  categories: CatalogueTaxonomyItem[];
  occasions: CatalogueTaxonomyItem[];
  tags: CatalogueTaxonomyItem[];
};

export type CatalogueCardProduct = {
  id: string;
  slug: string;
  title: string;
  titleBn: string | null;
  featured: boolean;
  category: CatalogueTaxonomyItem | null;
  image: {
    thumbPath: string;
    alt: string;
    altBn: string | null;
    width: number;
    height: number;
  } | null;
};

export type CataloguePage = {
  products: CatalogueCardProduct[];
  page: number;
  pageCount: number;
  total: number;
};

export type CatalogueProduct = {
  id: string;
  slug: string;
  title: string;
  titleBn: string | null;
  description: string;
  descriptionBn: string | null;
  materialNotes: string | null;
  materialNotesBn: string | null;
  personalisation: Personalisation;
  turnaroundDays: number | null;
  category: CatalogueTaxonomyItem | null;
  occasions: CatalogueTaxonomyItem[];
  tags: CatalogueTaxonomyItem[];
  images: {
    id: string;
    path: string;
    thumbPath: string;
    alt: string;
    altBn: string | null;
    width: number;
    height: number;
  }[];
};

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function catalogueConditions(filters: ParsedCatalogueSearchParams): SQL[] {
  const conditions: SQL[] = [eq(products.status, "published")];

  if (filters.category) {
    conditions.push(sql`exists (
      select 1 from "categories" as "catalogue_category"
      where "catalogue_category"."id" = ${products.categoryId}
        and "catalogue_category"."slug" = ${filters.category}
    )`);
  }
  if (filters.occasion) {
    conditions.push(sql`exists (
      select 1 from "product_occasions" as "catalogue_product_occasion"
      inner join "occasions" as "catalogue_occasion"
        on "catalogue_occasion"."id" = "catalogue_product_occasion"."occasion_id"
      where "catalogue_product_occasion"."product_id" = ${products.id}
        and "catalogue_occasion"."slug" = ${filters.occasion}
    )`);
  }
  if (filters.tag) {
    conditions.push(sql`exists (
      select 1 from "product_tags" as "catalogue_product_tag"
      inner join "tags" as "catalogue_tag"
        on "catalogue_tag"."id" = "catalogue_product_tag"."tag_id"
      where "catalogue_product_tag"."product_id" = ${products.id}
        and "catalogue_tag"."slug" = ${filters.tag}
    )`);
  }
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    conditions.push(
      or(
        ilike(products.title, pattern),
        ilike(products.titleBn, pattern),
        ilike(products.description, pattern),
        ilike(products.descriptionBn, pattern),
        ilike(products.materialNotes, pattern),
        ilike(products.materialNotesBn, pattern),
      )!,
    );
  }

  return conditions;
}

function cardFromRow(row: {
  id: string;
  slug: string;
  title: string;
  titleBn: string | null;
  featured: boolean;
  category: CatalogueTaxonomyItem | null;
  images: CatalogueCardProduct["image"][];
}): CatalogueCardProduct {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleBn: row.titleBn,
    featured: row.featured,
    category: row.category,
    image: row.images[0] ?? null,
  };
}

/** Public catalogue query. Published status is unconditional; every other filter combines with it. */
export async function listPublishedProducts(
  filters: ParsedCatalogueSearchParams,
): Promise<CataloguePage> {
  const where = and(...catalogueConditions(filters));
  const orderBy =
    filters.sort === "featured"
      ? [desc(products.featured), desc(products.publishedAt), desc(products.createdAt)]
      : [desc(products.publishedAt), desc(products.createdAt)];

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(products).where(where),
    db.query.products.findMany({
      where,
      orderBy,
      limit: CATALOGUE_PAGE_SIZE,
      offset: (filters.page - 1) * CATALOGUE_PAGE_SIZE,
      columns: { id: true, slug: true, title: true, titleBn: true, featured: true },
      with: {
        category: { columns: { slug: true, name: true, nameBn: true } },
        images: {
          columns: {
            thumbPath: true,
            alt: true,
            altBn: true,
            width: true,
            height: true,
          },
          orderBy: [asc(productImages.sortOrder), asc(productImages.createdAt)],
          limit: 1,
        },
      },
    }),
  ]);

  return {
    products: rows.map(cardFromRow),
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / CATALOGUE_PAGE_SIZE)),
    total,
  };
}

export const getCatalogueTaxonomy = cache(async (): Promise<CatalogueTaxonomy> => {
  const [categoryRows, occasionRows, tagRows] = await Promise.all([
    db.query.categories.findMany({
      columns: { slug: true, name: true, nameBn: true },
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
    }),
    db.query.occasions.findMany({
      columns: { slug: true, name: true, nameBn: true },
      orderBy: [asc(occasions.sortOrder), asc(occasions.name)],
    }),
    db.query.tags.findMany({
      columns: { slug: true, name: true, nameBn: true },
      orderBy: [asc(tags.name)],
    }),
  ]);
  return { categories: categoryRows, occasions: occasionRows, tags: tagRows };
});

/** Public detail query; drafts and archived products deliberately look like a 404. */
export const getPublishedProduct = cache(async (slug: string): Promise<CatalogueProduct | null> => {
  const row = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "published")),
    columns: {
      id: true,
      slug: true,
      title: true,
      titleBn: true,
      description: true,
      descriptionBn: true,
      materialNotes: true,
      materialNotesBn: true,
      personalisation: true,
      turnaroundDays: true,
    },
    with: {
      category: { columns: { slug: true, name: true, nameBn: true } },
      images: {
        columns: {
          id: true,
          path: true,
          thumbPath: true,
          alt: true,
          altBn: true,
          width: true,
          height: true,
        },
        orderBy: [asc(productImages.sortOrder), asc(productImages.createdAt)],
      },
      productOccasions: {
        with: { occasion: { columns: { slug: true, name: true, nameBn: true } } },
      },
      productTags: {
        with: { tag: { columns: { slug: true, name: true, nameBn: true } } },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleBn: row.titleBn,
    description: row.description,
    descriptionBn: row.descriptionBn,
    materialNotes: row.materialNotes,
    materialNotesBn: row.materialNotesBn,
    personalisation: row.personalisation,
    turnaroundDays: row.turnaroundDays,
    category: row.category,
    occasions: row.productOccasions.map(({ occasion }) => occasion),
    tags: row.productTags.map(({ tag }) => tag),
    images: row.images,
  };
});

export async function listRelatedProducts(product: CatalogueProduct, limit = 4) {
  const relation = product.category
    ? sql`exists (
        select 1 from "categories" as "related_category"
        where "related_category"."id" = ${products.categoryId}
          and "related_category"."slug" = ${product.category.slug}
      )`
    : eq(products.featured, true);
  const rows = await db.query.products.findMany({
    where: and(eq(products.status, "published"), ne(products.id, product.id), relation),
    orderBy: [desc(products.featured), desc(products.publishedAt), desc(products.createdAt)],
    limit,
    columns: { id: true, slug: true, title: true, titleBn: true, featured: true },
    with: {
      category: { columns: { slug: true, name: true, nameBn: true } },
      images: {
        columns: {
          thumbPath: true,
          alt: true,
          altBn: true,
          width: true,
          height: true,
        },
        orderBy: [asc(productImages.sortOrder), asc(productImages.createdAt)],
        limit: 1,
      },
    },
  });
  return rows.map(cardFromRow);
}

/** One aggregate row per product/day keeps OD-40 cheap without storing visitor identifiers. */
export async function incrementProductView(productId: string) {
  const day = formatInTimeZone(new Date(), MELBOURNE_TZ, "yyyy-MM-dd");
  await db
    .insert(productViewStats)
    .values({ productId, day, views: 1 })
    .onConflictDoUpdate({
      target: [productViewStats.productId, productViewStats.day],
      set: { views: sql`${productViewStats.views} + 1` },
    });
}
