import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, mocks } = await vi.hoisted(async () => {
  const { createDbMock } = await import("@/test/db-mock");
  return {
    dbMock: createDbMock(),
    mocks: { verifyTurnstile: vi.fn(), sendEmail: vi.fn(), headers: vi.fn() },
  };
});
vi.mock("@/db", () => ({ db: dbMock.db }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/db/queries/settings", () => ({
  getGeneralSettings: vi.fn(async () => ({
    studioName: "Shudha's Studio",
    tagline: "",
    taglineBn: "",
  })),
}));
vi.mock("@/lib/i18n", async (importOriginal) => {
  const { createT, getMessages } = await import("@/lib/i18n/t");
  return {
    ...(await importOriginal<typeof import("@/lib/i18n")>()),
    getT: async () => createT(getMessages("en")),
  };
});

import { resetRateLimit } from "@/lib/booking/rate-limit";
import { submitContactMessage } from "./contact";

function form(over: Record<string, string> = {}) {
  const fd = new FormData();
  const base = {
    name: "Asha",
    email: "asha@example.com",
    phone: "0412 345 678",
    message: "I would love a nameplate for my parents.",
    turnstileToken: "tok",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}

let ip = 0;
beforeEach(() => {
  dbMock.reset();
  resetRateLimit();
  mocks.headers.mockResolvedValue(
    new Headers({ "x-nf-client-connection-ip": `198.51.100.${++ip}` }),
  );
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.sendEmail.mockResolvedValue({ ok: true, dryRun: true });
});

describe("submitContactMessage", () => {
  it("checks Turnstile first", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);
    expect(await submitContactMessage(form())).toMatchObject({
      ok: false,
      error: "errors.turnstile",
    });
    expect(dbMock.methodCalls("insert")).toHaveLength(0);
  });

  it("returns field errors for a short message or a bad number", async () => {
    const result = await submitContactMessage(form({ message: "hi", phone: "abc" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.message).toEqual(["errors.tooShort"]);
    expect(result.fieldErrors?.phone).toEqual(["errors.whatsappNumber"]);
  });

  it("stores the message and emails the owner with a reply-to", async () => {
    expect(await submitContactMessage(form())).toEqual({ ok: true, data: undefined });
    expect(dbMock.methodCalls("values")[0]?.[0]).toEqual({
      name: "Asha",
      email: "asha@example.com",
      phone: "61412345678",
      message: "I would love a nameplate for my parents.",
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "Owner@Example.com",
        replyTo: "asha@example.com",
        subject: "New message from Asha",
        templateName: "owner-contact-message",
      }),
    );
  });

  it("keeps the submission when the email fails and rate-limits the sixth attempt", async () => {
    mocks.sendEmail.mockResolvedValue({ ok: false, error: "down" });
    expect((await submitContactMessage(form())).ok).toBe(true);
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7" }));
    for (let i = 0; i < 5; i++) expect((await submitContactMessage(form())).ok).toBe(true);
    expect(await submitContactMessage(form())).toMatchObject({
      ok: false,
      error: "errors.rateLimited",
    });
  });
});
