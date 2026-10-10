import { describe, expect, it } from "vitest";
import en from "./en.json";
import bn from "./bn.json";
import { createT, getMessages, type MessageKey } from "./t";

describe("createT", () => {
  it("returns the English string for en", () => {
    const t = createT(getMessages("en"));
    expect(t("common.save")).toBe("Save");
  });

  it("returns Bengali when translated and falls back to English otherwise", () => {
    const messages = { ...getMessages("bn") };
    const t = createT(messages);
    expect(t("common.save")).toBe(bn["common.save"]);
    const fallback = createT({ ...messages, "common.save": en["common.save"] });
    expect(fallback("common.save")).toBe("Save");
  });

  it("interpolates {params} and leaves unknown placeholders visible", () => {
    const t = createT(getMessages("en"));
    expect(t("admin.dashboard.signedInAs", { email: "a@b.c" })).toBe("Signed in as a@b.c");
    expect(t("admin.dashboard.signedInAs")).toBe("Signed in as {email}");
  });

  it("returns the key itself for an unknown key rather than crashing", () => {
    const t = createT(getMessages("en"));
    expect(t("does.not.exist" as MessageKey)).toBe("does.not.exist");
  });
});
