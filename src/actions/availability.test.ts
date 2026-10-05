import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: { requireOwner: vi.fn(), revalidatePath: vi.fn() },
  };
});

vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { defaultAvailabilitySettings } from "@/lib/validators/availability";
import { addBlockedPeriod, deleteBlockedPeriod, updateAvailability } from "./availability";

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockReset();
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
  mocks.revalidatePath.mockReset();
});

describe("availability actions", () => {
  it("authenticates before validating availability input", async () => {
    const result = await updateAvailability({ ...defaultAvailabilitySettings, rules: [] });
    expect(mocks.requireOwner).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: false, error: "errors.invalidInput" });
    expect(dbMock.db.transaction).not.toHaveBeenCalled();
  });

  it("replaces settings and seven weekly rules transactionally", async () => {
    const result = await updateAvailability(defaultAvailabilitySettings);
    expect(result).toEqual({ ok: true, data: defaultAvailabilitySettings });
    expect(dbMock.db.transaction).toHaveBeenCalledOnce();
    expect(dbMock.methodCalls("values")).toContainEqual([
      expect.arrayContaining([
        expect.objectContaining({ weekday: 0 }),
        expect.objectContaining({ weekday: 6 }),
      ]),
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/book");
  });

  it("stores blocked wall times as Melbourne instants", async () => {
    const result = await addBlockedPeriod({
      startsAt: "2026-10-05T10:00",
      endsAt: "2026-10-05T11:00",
      reason: "Holiday",
    });
    expect(result).toEqual({ ok: true, data: undefined });
    expect(dbMock.methodCalls("values").at(-1)?.[0]).toMatchObject({
      startsAt: new Date("2026-10-04T23:00:00.000Z"),
      endsAt: new Date("2026-10-05T00:00:00.000Z"),
      reason: "Holiday",
    });
  });

  it("returns not found when deleting an unknown blocked period", async () => {
    dbMock.queueResults([]);
    const result = await deleteBlockedPeriod("11111111-1111-4111-8111-111111111111");
    expect(result).toMatchObject({ ok: false, error: "errors.notFound" });
  });
});
