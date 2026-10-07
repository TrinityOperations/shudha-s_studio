import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return { dbMock: createDbMock() };
});
vi.mock("@/db", () => ({ db: dbMock.db }));

import { recordProductView } from "./record-view";

const P1 = "11111111-1111-4111-8111-111111111111";

beforeEach(() => dbMock.reset());

describe("recordProductView", () => {
  it("upserts one view for today's Melbourne date", async () => {
    await recordProductView(P1, "Mozilla/5.0 (iPhone)");
    const values = dbMock.methodCalls("values")[0]?.[0] as {
      productId: string;
      day: string;
      views: number;
    };
    expect(values).toMatchObject({ productId: P1, views: 1 });
    expect(values.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dbMock.methodCalls("onConflictDoUpdate")).toHaveLength(1);
  });

  it.each([
    "Googlebot/2.1",
    "facebookexternalhit crawler",
    "Slackbot-LinkExpanding",
    "WhatsApp link preview",
    "Baiduspider",
    "Yahoo! Slurp",
  ])("skips %s", async (ua) => {
    await recordProductView(P1, ua);
    expect(dbMock.methodCalls("insert")).toHaveLength(0);
  });

  it("counts a request with no user agent", async () => {
    await recordProductView(P1, null);
    expect(dbMock.methodCalls("insert")).toHaveLength(1);
  });
});
