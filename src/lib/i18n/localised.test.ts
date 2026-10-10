import { describe, expect, it } from "vitest";
import { localised } from "./localised";

describe("localised (PW-81 fallback)", () => {
  it("returns Bengali only on a Bengali page and only when the owner wrote some", () => {
    expect(localised("bn", "Mug", "মগ")).toBe("মগ");
    expect(localised("en", "Mug", "মগ")).toBe("Mug");
    expect(localised("bn", "Mug", null)).toBe("Mug");
    expect(localised("bn", "Mug", undefined)).toBe("Mug");
    expect(localised("bn", "Mug", "")).toBe("Mug");
    expect(localised("bn", "Mug", "   ")).toBe("Mug");
  });
});
