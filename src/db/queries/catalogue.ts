import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  occasions,
  productImages,
  productOccasions,
  products,
  productTags,
  tags,
  type Personalisation,
  type ProductStatus,
} from "@/db/schema";
import {
  CATALOGUE_PAGE_SIZE,
  type CatalogueParams,
  type CatalogueSort,
} from "@/lib/validators/catalogue";

/**
 * Public reads. EVERY exported query here filters `status = 'published'` itself, so a page can't
 * leak a draft by forgetting a condition. Admin reads live in products.ts.
 */

// Stand-alone builder for subqueries: pure, so the where clause can be unit-tested without a DB.
const qb = new QueryBuilder();

export type CatalogueCard = {
  id: string;
  slug: string;
  title: string;
  titleBn: string | null;
  priceFrom: number | null;
  category: { slug: string; name: string; nameBn: string | null } | null;
  thumb: { thumbPath: string; alt: string; altBn: string | null } | null;
  /** Second photo, shown on hover by the restyled card (docs/design.md); null when there is one photo */
  hoverThumb: { thumbPath: string; alt: string; altBn: string | null } | null;
};

export type CataloguePage = {
  items: CatalogueCard[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type CatalogueTerm = { slug: string; name: string; nameBn: string | null };

export type ProductDetail = {
  id: string;
  slug: string;
  status: ProductStatus;
  title: string;
  titleBn: string | null;
  description: string;
  descriptionBn: string | null;
  materialNotes: string | null;
  materialNotesBn: string | null;
  personalisation: Personalisation;
  turnaroundDays: number | null;
  priceFrom: number | null;
  videoUrl: string | null;
  publishedAt: string | null;
  categoryId: string | null;
  category: CatalogueTerm | null;
  occasions: CatalogueTerm[];
  tags: CatalogueTerm[];
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

const published = () => eq(products.status, "published");

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Filters combine with AND; values within one filter are OR'd (any of the chosen categories). */
export function catalogueWhere(params: CatalogueParams): SQL {
  const conditions: SQL[] = [published()];

  if (params.category.length) {
    conditions.push(
      inArray(
        products.categoryId,
        qb
          .select({ id: categories.id })
          .from(categories)
          .where(inArray(categories.slug, params.category)),
      ),
    );
  }
  if (params.occasion.length) {
    conditions.push(
      inArray(
        products.id,
        qb
          .select({ productId: productOccasions.productId })
          .from(productOccasions)
          .innerJoin(occasions, eq(occasions.id, productOccasions.occasionId))
          .where(inArray(occasions.slug, params.occasion)),
      ),
    );
  }
  if (params.tag.length) {
    conditions.push(
      inArray(
        products.id,
        qb
          .select({ productId: productTags.productId })
          .from(productTags)
          .innerJoin(tags, eq(tags.id, productTags.tagId))
          .where(inArray(tags.slug, params.tag)),
      ),
    );
  }
  if (params.q) {
    const pattern = `%${escapeLike(params.q)}%`;
    conditions.push(
      or(
        ilike(products.title, pattern),
        ilike(products.titleBn, pattern),
        ilike(products.description, pattern),
        ilike(products.descriptionBn, pattern),
      )!,
    );
  }
  return and(...conditions)!;
}

export function catalogueOrderBy(sort: CatalogueSort): SQL[] {
  const newest = [desc(products.publishedAt), desc(products.createdAt)];
  return sort === "featured" ? [desc(products.featured), ...newest] : newest;
}

// Inline in each query: hoisting the config loses the literal `true` column types drizzle needs.
const cardColumns = { id: true, slug: true, title: true, titleBn: true, priceFrom: true } as const;
function cardWith() {
  return {
    category: { columns: { slug: true, name: true, nameBn: true } as const },
    images: {
      columns: { thumbPath: true, alt: true, altBn: true } as const,
      orderBy: [asc(productImages.sortOrder), asc(productImages.createdAt)],
      limit: 2,
    },
  };
}

type CardRow = {
  id: string;
  slug: string;
  title: string;
  titleBn: string | null;
  priceFrom: number | null;
  category: CatalogueCard["category"];
  images: NonNullable<CatalogueCard["thumb"]>[];
};

function toCard(row: CardRow): CatalogueCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleBn: row.titleBn,
    priceFrom: row.priceFrom,
    category: row.category,
    thumb: row.images[0] ?? null,
    hoverThumb: row.images[1] ?? null,
  };
}

/** Cards for any published-only where clause (home page sections, slice #9). */
export async function listCatalogueCards(
  where: SQL,
  orderBy: SQL[],
  limit: number,
): Promise<CatalogueCard[]> {
  const rows = await db.query.products.findMany({
    where,
    orderBy,
    limit,
    columns: cardColumns,
    with: cardWith(),
  });
  return rows.map(toCard);
}

/** Published products by id, in the order the ids were given (the owner's home page picks). */
export async function listPublishedProductsByIds(ids: string[]): Promise<CatalogueCard[]> {
  if (ids.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: and(published(), inArray(products.id, ids)),
    columns: cardColumns,
    with: cardWith(),
  });
  const byId = new Map(rows.map((row) => [row.id, toCard(row)]));
  return ids.map((id) => byId.get(id)).filter((card): card is CatalogueCard => !!card);
}

/** PW-10..13, PW-15: one page of published products matching the URL params. */
export async function listCatalogue(params: CatalogueParams): Promise<CataloguePage> {
  const where = catalogueWhere(params);
  const [{ total }] = await db.select({ total: count() }).from(products).where(where);
  const pageCount = Math.max(1, Math.ceil(total / CATALOGUE_PAGE_SIZE));
  const page = Math.min(params.page, pageCount);

  const rows = await db.query.products.findMany({
    where,
    orderBy: catalogueOrderBy(params.sort),
    limit: CATALOGUE_PAGE_SIZE,
    offset: (page - 1) * CATALOGUE_PAGE_SIZE,
    columns: cardColumns,
    with: cardWith(),
  });

  return { items: rows.map(toCard), total, page, pageCount, pageSize: CATALOGUE_PAGE_SIZE };
}

export type CatalogueFacets = {
  categories: CatalogueTerm[];
  occasions: CatalogueTerm[];
  tags: CatalogueTerm[];
};

/** Filter options: only terms that have at least one published product, in display order. */
export async function listCatalogueFacets(): Promise<CatalogueFacets> {
  const [categoryRows, occasionRows, tagRows] = await Promise.all([
    db
      .select({ slug: categories.slug, name: categories.name, nameBn: categories.nameBn })
      .from(categories)
      .where(
        inArray(
          categories.id,
          qb.select({ id: products.categoryId }).from(products).where(published()),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ slug: occasions.slug, name: occasions.name, nameBn: occasions.nameBn })
      .from(occasions)
      .where(
        inArray(
          occasions.id,
          qb
            .select({ id: productOccasions.occasionId })
            .from(productOccasions)
            .innerJoin(products, eq(products.id, productOccasions.productId))
            .where(published()),
        ),
      )
      .orderBy(asc(occasions.sortOrder), asc(occasions.name)),
    db
      .select({ slug: tags.slug, name: tags.name, nameBn: tags.nameBn })
      .from(tags)
      .where(
        inArray(
          tags.id,
          qb
            .select({ id: productTags.tagId })
            .from(productTags)
            .innerJoin(products, eq(products.id, productTags.productId))
            .where(published()),
        ),
      )
      .orderBy(asc(tags.name)),
  ]);
  return { categories: categoryRows, occasions: occasionRows, tags: tagRows };
}

/** Relational config for the product page. Returned fresh so literal types survive. */
export function detailWith() {
  return {
    category: { columns: { slug: true, name: true, nameBn: true } as const },
    images: {
      columns: {
        id: true,
        path: true,
        thumbPath: true,
        alt: true,
        altBn: true,
        width: true,
        height: true,
      } as const,
      orderBy: [asc(productImages.sortOrder), asc(productImages.createdAt)],
    },
    productOccasions: {
      columns: {} as const,
      with: {
        occasion: { columns: { slug: true, name: true, nameBn: true, sortOrder: true } as const },
      },
    },
    productTags: {
      columns: {} as const,
      with: { tag: { columns: { slug: true, name: true, nameBn: true } as const } },
    },
  };
}

export type ProductDetailRow = {
  id: string;
  slug: string;
  status: ProductStatus;
  title: string;
  titleBn: string | null;
  description: string;
  descriptionBn: string | null;
  materialNotes: string | null;
  materialNotesBn: string | null;
  personalisation: Personalisation;
  turnaroundDays: number | null;
  priceFrom: number | null;
  videoUrl: string | null;
  publishedAt: Date | null;
  categoryId: string | null;
  category: CatalogueTerm | null;
  images: ProductDetail["images"];
  productOccasions: { occasion: CatalogueTerm & { sortOrder: number } }[];
  productTags: { tag: CatalogueTerm }[];
};

/** Pure row → view model, shared with the admin preview (products.ts). */
export function toProductDetail(row: ProductDetailRow): ProductDetail {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    title: row.title,
    titleBn: row.titleBn,
    description: row.description,
    descriptionBn: row.descriptionBn,
    materialNotes: row.materialNotes,
    materialNotesBn: row.materialNotesBn,
    personalisation: row.personalisation,
    turnaroundDays: row.turnaroundDays,
    priceFrom: row.priceFrom,
    videoUrl: row.videoUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    categoryId: row.categoryId,
    category: row.category,
    occasions: [...row.productOccasions]
      .sort((a, b) => a.occasion.sortOrder - b.occasion.sortOrder)
      .map(({ occasion: { slug, name, nameBn } }) => ({ slug, name, nameBn })),
    tags: row.productTags.map(({ tag }) => tag).sort((a, b) => a.name.localeCompare(b.name)),
    images: row.images,
  };
}

export function publishedProductWhere(slug: string): SQL {
  return and(eq(products.slug, slug), published())!;
}

/** PW-20..23: the product page. Null for drafts, archived products and unknown slugs. */
export async function getPublishedProduct(slug: string): Promise<ProductDetail | null> {
  const row = await db.query.products.findFirst({
    where: publishedProductWhere(slug),
    with: detailWith(),
  });
  return row ? toProductDetail(row) : null;
}

export type RelatedInput = {
  productId: string;
  categoryId: string | null;
  occasionSlugs: string[];
  limit?: number;
};

/** Same category first (newest), then products sharing an occasion, published only, never itself. */
export function relatedByCategoryWhere(input: RelatedInput): SQL | null {
  if (!input.categoryId) return null;
  return and(
    published(),
    eq(products.categoryId, input.categoryId),
    ne(products.id, input.productId),
  )!;
}

export function relatedByOccasionWhere(input: RelatedInput, excludeIds: string[]): SQL | null {
  if (!input.occasionSlugs.length) return null;
  const exclude = [input.productId, ...excludeIds];
  return and(
    published(),
    notInArray(products.id, exclude),
    inArray(
      products.id,
      qb
        .select({ productId: productOccasions.productId })
        .from(productOccasions)
        .innerJoin(occasions, eq(occasions.id, productOccasions.occasionId))
        .where(inArray(occasions.slug, input.occasionSlugs)),
    ),
  )!;
}

export async function listRelatedProducts(input: RelatedInput): Promise<CatalogueCard[]> {
  const limit = input.limit ?? 4;
  const picked: CatalogueCard[] = [];

  const byCategory = relatedByCategoryWhere(input);
  if (byCategory) {
    const rows = await db.query.products.findMany({
      where: byCategory,
      orderBy: catalogueOrderBy("newest"),
      limit,
      columns: cardColumns,
      with: cardWith(),
    });
    picked.push(...rows.map(toCard));
  }

  if (picked.length < limit) {
    const byOccasion = relatedByOccasionWhere(
      input,
      picked.map((card) => card.id),
    );
    if (byOccasion) {
      const rows = await db.query.products.findMany({
        where: byOccasion,
        orderBy: catalogueOrderBy("newest"),
        limit: limit - picked.length,
        columns: cardColumns,
        with: cardWith(),
      });
      picked.push(...rows.map(toCard));
    }
  }

  return picked;
}

/**
 * PW-60..PW-62: the published products behind a wishlist, in the order the slugs were given.
 * Unknown, draft and archived slugs are simply missing from the result.
 */
export async function listPublishedProductsBySlugs(slugs: string[]): Promise<CatalogueCard[]> {
  if (slugs.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: and(published(), inArray(products.slug, slugs)),
    columns: cardColumns,
    with: cardWith(),
  });
  const bySlug = new Map(rows.map((row) => [row.slug, toCard(row)]));
  return slugs.map((slug) => bySlug.get(slug)).filter((card): card is CatalogueCard => !!card);
}

export type ProductOption = { id: string; slug: string; title: string; titleBn: string | null };

/** Published products for pickers (booking form "product of interest"), newest first. */
export async function listPublishedProductOptions(): Promise<ProductOption[]> {
  return db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      titleBn: products.titleBn,
    })
    .from(products)
    .where(published())
    .orderBy(desc(products.publishedAt), desc(products.createdAt));
}
