import { describe, expect, it } from "vitest";
import { buildReplyLinks, buildReplyMessage } from "./reply-message";

const input = {
  customerName: "Asha",
  customerPhone: "61412345678",
  customerEmail: "asha@example.com",
  startsAt: new Date("2026-07-15T01:00:00.000Z"), // Wed 15 Jul 11:00 Melbourne
  locale: "en",
  studioName: "Shudha's Studio",
};

describe("buildReplyMessage", () => {
  it("greets in English with the Melbourne date and time", () => {
    const { body, subject, locale } = buildReplyMessage(input);
    expect(locale).toBe("en");
    expect(body).toBe(
      "Hi Asha, this is Shudha from Shudha's Studio about your consultation on Wednesday 15 July at 11:00 am.",
    );
    expect(subject).toContain("Wednesday 15 July");
  });

  it("greets in Bengali for a bn booking and falls back to English for an unknown locale", () => {
    const bn = buildReplyMessage({ ...input, locale: "bn" });
    expect(bn.locale).toBe("bn");
    expect(bn.body).toMatch(/[ঀ-৿]/);
    expect(bn.body).toContain("Asha");
    expect(buildReplyMessage({ ...input, locale: "fr" }).locale).toBe("en");
  });

  it("builds a wa.me link and a mailto with subject and body", () => {
    const links = buildReplyLinks(input);
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/61412345678\?text=Hi%20Asha/);
    expect(links.mailto).toMatch(/^mailto:asha%40example\.com\?subject=.+&body=Hi%20Asha/);
  });
});
