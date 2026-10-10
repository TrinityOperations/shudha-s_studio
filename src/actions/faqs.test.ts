import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return { dbMock: createDbMock(), mocks: { requireOwner: vi.fn(), revalidatePath: vi.fn() } };
});
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createFaq, deleteFaq, reorderFaqs, updateFaq } from "./faqs";

const ID = "11111111-1111-4111-8111-111111111111";
const values = {
  question: " Do you deliver? ",
  questionBn: "",
  answer: "Yes.",
  answerBn: "",
  published: true,
};

beforeEach(() => {
  dbMock.reset();
  mocks.requireOwner.mockResolvedValue({ id: "owner" });
});

describe("faq actions", () => {
  it("creates at the end of the list with trimmed text", async () => {
    dbMock.queueResults([{ next: 3 }], [{ id: ID, ...values }]);
    const result = await createFaq(values);
    expect(result.ok).toBe(true);
    expect(dbMock.methodCalls("values")[0]?.[0]).toEqual({
      question: "Do you deliver?",
      questionBn: null,
      answer: "Yes.",
      answerBn: null,
      published: true,
      sortOrder: 3,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/faq");
  });

  it("rejects an empty question or answer without touching auth", async () => {
    const result = await createFaq({ ...values, question: "", answer: " " });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.question).toEqual(["errors.required"]);
    expect(result.fieldErrors?.answer).toEqual(["errors.required"]);
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("updates, hides, deletes and reorders by id", async () => {
    dbMock.queueResults([{ id: ID, ...values, published: false }]);
    expect((await updateFaq(ID, { ...values, published: false })).ok).toBe(true);
    expect(dbMock.methodCalls("set")[0]?.[0]).toMatchObject({ published: false });
    expect((await updateFaq("nope", values)).ok).toBe(false);

    dbMock.queueResults([]);
    expect(await updateFaq(ID, values)).toMatchObject({ ok: false, error: "errors.notFound" });

    expect((await deleteFaq(ID)).ok).toBe(true);
    expect(dbMock.methodCalls("delete")).toHaveLength(1);

    dbMock.reset();
    const other = "22222222-2222-4222-8222-222222222222";
    expect((await reorderFaqs({ ids: [other, ID] })).ok).toBe(true);
    expect(dbMock.methodCalls("set").map((a) => a[0])).toEqual([
      { sortOrder: 0 },
      { sortOrder: 1 },
    ]);
    expect((await reorderFaqs({ ids: [] })).ok).toBe(false);
  });
});
