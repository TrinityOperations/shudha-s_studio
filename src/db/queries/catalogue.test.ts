import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const dbMock = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return createDbMock();
});
vi.mock("@/db", () => ({ db: dbMock.db }));

import { getPublishedProduct, listPublishedProducts } from "./catalogue";

describe("public catalogue queries", () => {
  beforeEach(() => dbMock.reset());

  it("always constrains catalogue results to published products", async () => {
    dbMock.queueResults([{ total: 0 }]);
    dbMock.query.products.findMany.mockResolvedValue([]);

    await listPublishedProducts({ sort: "newest", page: 1 });

    const options = dbMock.query.products.findMany.mock.calls[0][0];
    const compiled = new PgDialect().sqlToQuery(options.where.getSQL());
    expect(compiled.sql).toContain('"products"."status" = $1');
    expect(compiled.params).toContain("published");
  });

  it("combines category, occasion, tag and bilingual keyword filters", async () => {
    dbMock.queueResults([{ total: 0 }]);
    dbMock.query.products.findMany.mockResolvedValue([]);

    await listPublishedProducts({
      category: "mugs",
      occasion: "birthday",
      tag: "photo",
      q: "বাংলা",
      sort: "featured",
      page: 2,
    });

    const options = dbMock.query.products.findMany.mock.calls[0][0];
    const compiled = new PgDialect().sqlToQuery(options.where.getSQL());
    expect(compiled.params).toEqual(
      expect.arrayContaining(["published", "mugs", "birthday", "photo", "%বাংলা%"]),
    );
    expect(options.offset).toBe(12);
    expect(options.limit).toBe(12);
  });

  it("requires published status when loading a product detail", async () => {
    dbMock.query.products.findFirst.mockResolvedValue(null);

    await expect(getPublishedProduct("draft-product")).resolves.toBeNull();

    const options = dbMock.query.products.findFirst.mock.calls[0][0];
    const compiled = new PgDialect().sqlToQuery(options.where.getSQL());
    expect(compiled.params).toEqual(expect.arrayContaining(["draft-product", "published"]));
  });
});
