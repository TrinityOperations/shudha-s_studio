import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn(), render: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock("@react-email/components", () => ({ render: mocks.render }));

import { isEmailDryRun, sendEmail } from "./email";

const element = createElement("p", null, "hello");
const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  mocks.send.mockReset();
  mocks.render.mockResolvedValue("hello");
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("dry-runs under NODE_ENV=test and logs to, subject and template without a body", async () => {
    expect(isEmailDryRun()).toBe(true);
    const result = await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      react: element,
      templateName: "x",
    });
    expect(result).toEqual({ ok: true, dryRun: true });
    expect(mocks.send).not.toHaveBeenCalled();
    const line = (console.info as unknown as { mock: { calls: string[][] } }).mock.calls[0][0];
    expect(line).toContain("to=a@example.com");
    expect(line).toContain("template=x");
    expect(line).not.toContain("hello");
  });

  it("sends through Resend with text, reply-to and attachments when not in dry run", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_live_123");
    vi.stubEnv("EMAIL_DRY_RUN", "");
    const { sendEmail: send } = await import("./email");
    mocks.send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    const result = await send({
      to: "a@example.com",
      subject: "Hi",
      react: element,
      replyTo: "b@example.com",
      attachments: [
        { filename: "c.ics", content: "BEGIN:VCALENDAR", contentType: "text/calendar" },
      ],
    });
    expect(result).toEqual({ ok: true, id: "msg_1" });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@example.com",
        subject: "Hi",
        text: "hello",
        replyTo: "b@example.com",
        attachments: [
          { filename: "c.ics", content: "BEGIN:VCALENDAR", contentType: "text/calendar" },
        ],
      }),
    );
    expect(mocks.render).toHaveBeenCalledWith(element, { plainText: true });
  });

  it("returns ok:false on a Resend error and on a throw, never throwing itself", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_live_123");
    vi.stubEnv("EMAIL_DRY_RUN", "");
    const { sendEmail: send } = await import("./email");
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: { message: "domain not verified", name: "validation_error" },
    });
    expect(await send({ to: "a@example.com", subject: "Hi", react: element })).toEqual({
      ok: false,
      error: "domain not verified",
    });
    mocks.send.mockRejectedValueOnce(new Error("network down"));
    expect(await send({ to: "a@example.com", subject: "Hi", react: element })).toEqual({
      ok: false,
      error: "network down",
    });
  });

  it("dry-runs when the key is not a Resend key or EMAIL_DRY_RUN=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "not-a-real-key");
    const a = await import("./email");
    expect(a.isEmailDryRun()).toBe(true);
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "re_live_123");
    vi.stubEnv("EMAIL_DRY_RUN", "1");
    const b = await import("./email");
    expect(b.isEmailDryRun()).toBe(true);
  });
});
