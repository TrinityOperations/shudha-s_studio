import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/db", () => ({ db: { query: { gallerySubmissions: { findMany } } } }));

import { listApprovedGallery } from "./gallery";

beforeEach(() => findMany.mockReset());

describe("listApprovedGallery", () => {
  it("asks only for approved rows with public paths and maps them to tiles", async () => {
    findMany.mockResolvedValue([
      {
        id: "a",
        publicImagePath: "a/x/full.webp",
        publicThumbPath: "a/x/thumb.webp",
        firstName: "Asha",
        note: null,
      },
    ]);
    const tiles = await listApprovedGallery(24, 48);
    expect(tiles).toEqual([
      {
        id: "a",
        imagePath: "a/x/full.webp",
        thumbPath: "a/x/thumb.webp",
        firstName: "Asha",
        note: null,
      },
    ]);
    const args = findMany.mock.calls[0][0] as { limit: number; offset: number; where: SQL };
    expect(args.limit).toBe(24);
    expect(args.offset).toBe(48);
    // The where clause pins status = approved and non-null public paths (PW-72).
    const query = new PgDialect().sqlToQuery(args.where);
    const sql = `${query.sql} ${JSON.stringify(query.params)}`;
    expect(sql).toContain("approved");
    expect(sql).toContain("public_image_path");
    expect(sql).toContain("public_thumb_path");
    expect(sql).not.toContain("pending");
    expect(sql).not.toContain("hidden");
  });
});
