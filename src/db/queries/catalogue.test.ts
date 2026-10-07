import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return { dbMock: createDbMock() };
});
vi.mock("@/db", () => ({ db: dbMock.db }));

import { defaultCatalogueParams, parseCatalogueParams } from "@/lib/validators/catalogue";
import {
  catalogueOrderBy,
  catalogueWhere,
  getPublishedProduct,
  listCatalogue,
  listRelatedProducts,
  publishedProductWhere,
  relatedByCategoryWhere,
  relatedByOccasionWhere,
  toProductDetail,
} from "./catalogue";

const dialect = new PgDialect();
const render = (sql: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(sql);

const P1 = "11111111-1111-4111-8111-111111111111";
const CAT = "22222222-2222-4222-8222-222222222222";

/** Every public where clause must pin status to 'published', which excludes drafts and archived rows. */
function expectPublishedOnly(query: { sql: string; params: unknown[] }) {
  expect(query.sql).toMatch(/"products"\."status" = \$\d+/);
  expect(query.params).toContain("published");
  expect(query.params).not.toContain("draft");
  expect(query.params).not.toContain("archived");
}

beforeEach(() => dbMock.reset());

describe("catalogueWhere", () => {
  it("always restricts to published products, even with no filters", () => {
    const query = render(catalogueWhere(defaultCatalogueParams));
    expectPublishedOnly(query);
    expect(query.sql).toBe('"products"."status" = $1');
  });

  it("combines category, occasion, tag and search with AND, values within a filter with IN", () => {
    const params = parseCatalogueParams({
      category: ["mugs", "cards"],
      occasion: "eid",
      tag: "gold",
      q: "birthday",
    });
    const query = render(catalogueWhere(params));
    expectPublishedOnly(query);
    expect(query.sql).toContain(
      '"products"."category_id" in (select "id" from "categories" where "categories"."slug" in ($2, $3))',
    );
    expect(query.sql).toContain('"product_occasions" inner join "occasions"');
    expect(query.sql).toContain('"product_tags" inner join "tags"');
    expect(query.sql.split(" and ").length).toBe(5);
    expect(query.params).toEqual(
      expect.arrayContaining(["published", "mugs", "cards", "eid", "gold", "%birthday%"]),
    );
  });

  it("searches English and Bengali title and description with ILIKE", () => {
    const query = render(catalogueWhere(parseCatalogueParams({ q: "জন্মদিন" })));
    expect(query.sql).toContain('"products"."title" ilike $2');
    expect(query.sql).toContain('"products"."title_bn" ilike $3');
    expect(query.sql).toContain('"products"."description" ilike $4');
    expect(query.sql).toContain('"products"."description_bn" ilike $5');
    expect(query.params.slice(1)).toEqual(Array(4).fill("%জন্মদিন%"));
  });

  it("escapes LIKE wildcards in the search text", () => {
    const query = render(catalogueWhere(parseCatalogueParams({ q: "100%_off" })));
    expect(query.params[1]).toBe("%100\\%\\_off%");
  });
});

describe("catalogueOrderBy", () => {
  it("sorts newest by publishedAt then createdAt, featured first when asked", () => {
    expect(render(catalogueOrderBy("newest")[0]).sql).toBe('"products"."published_at" desc');
    expect(catalogueOrderBy("featured").map((o) => render(o).sql)).toEqual([
      '"products"."featured" desc',
      '"products"."published_at" desc',
      '"products"."created_at" desc',
    ]);
  });
});

describe("product page and related", () => {
  it("publishedProductWhere excludes drafts and archived rows by status", () => {
    const query = render(publishedProductWhere("eid-mug"));
    expectPublishedOnly(query);
    expect(query.sql).toBe('("products"."slug" = $1 and "products"."status" = $2)');
    expect(query.params).toEqual(["eid-mug", "published"]);
  });

  it("getPublishedProduct returns null when the published lookup finds nothing", async () => {
    dbMock.query.products.findFirst.mockResolvedValue(undefined);
    expect(await getPublishedProduct("a-draft")).toBeNull();
    const where = dbMock.query.products.findFirst.mock.calls[0]?.[0]?.where;
    expectPublishedOnly(render(where));
  });

  it("related queries are published-only and never include the product itself", () => {
    const input = { productId: P1, categoryId: CAT, occasionSlugs: ["eid"] };
    const byCategory = render(relatedByCategoryWhere(input)!);
    expectPublishedOnly(byCategory);
    expect(byCategory.sql).toContain('"products"."id" <> $3');
    const byOccasion = render(relatedByOccasionWhere(input, ["aaa"])!);
    expectPublishedOnly(byOccasion);
    expect(byOccasion.sql).toContain('"products"."id" not in ($2, $3)');
    expect(byOccasion.params).toEqual(expect.arrayContaining([P1, "aaa", "eid"]));
    expect(relatedByCategoryWhere({ ...input, categoryId: null })).toBeNull();
    expect(relatedByOccasionWhere({ ...input, occasionSlugs: [] }, [])).toBeNull();
  });

  it("listRelatedProducts tops up from occasions when the category has too few", async () => {
    dbMock.query.products.findMany
      .mockResolvedValueOnce([
        {
          id: "a",
          slug: "a",
          title: "A",
          titleBn: null,
          priceFrom: null,
          category: null,
          images: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "b",
          slug: "b",
          title: "B",
          titleBn: null,
          priceFrom: 10,
          category: null,
          images: [],
        },
      ]);
    const related = await listRelatedProducts({
      productId: P1,
      categoryId: CAT,
      occasionSlugs: ["eid"],
    });
    expect(related.map((c) => c.id)).toEqual(["a", "b"]);
    expect(dbMock.query.products.findMany.mock.calls[1]?.[0]?.limit).toBe(3);
  });
});

describe("listCatalogue", () => {
  it("pages 24 at a time and clamps the page to the last one", async () => {
    dbMock.queueResults([{ total: 30 }]);
    dbMock.query.products.findMany.mockResolvedValue([]);
    const result = await listCatalogue(parseCatalogueParams({ page: "9" }));
    expect(result).toMatchObject({ total: 30, page: 2, pageCount: 2, pageSize: 24, items: [] });
    expect(dbMock.query.products.findMany.mock.calls[0]?.[0]).toMatchObject({
      limit: 24,
      offset: 24,
    });
  });
});

describe("toProductDetail", () => {
  it("orders occasions by sortOrder, tags by name, and serialises publishedAt", () => {
    const detail = toProductDetail({
      id: P1,
      slug: "mug",
      status: "published",
      title: "Mug",
      titleBn: null,
      description: "",
      descriptionBn: null,
      materialNotes: null,
      materialNotesBn: null,
      personalisation: { options: ["name"], notes: "" },
      turnaroundDays: 5,
      priceFrom: 25,
      videoUrl: null,
      publishedAt: new Date("2026-10-01T00:00:00Z"),
      categoryId: CAT,
      category: { slug: "mugs", name: "Mugs", nameBn: null },
      images: [],
      productOccasions: [
        { occasion: { slug: "wedding", name: "Wedding", nameBn: null, sortOrder: 2 } },
        { occasion: { slug: "eid", name: "Eid", nameBn: "ঈদ", sortOrder: 1 } },
      ],
      productTags: [
        { tag: { slug: "z", name: "Zed", nameBn: null } },
        { tag: { slug: "a", name: "Alpha", nameBn: null } },
      ],
    });
    expect(detail.occasions.map((o) => o.slug)).toEqual(["eid", "wedding"]);
    expect(detail.tags.map((t) => t.name)).toEqual(["Alpha", "Zed"]);
    expect(detail.publishedAt).toBe("2026-10-01T00:00:00.000Z");
    expect(detail.priceFrom).toBe(25);
  });
});
