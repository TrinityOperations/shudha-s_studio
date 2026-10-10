import { describe, expect, it } from "vitest";
import en from "./en.json";
import bn from "./bn.json";

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

/** The sort the WORKFLOW.md command produces: plain code-point order of the full key. */
function isCodePointSorted(keys: string[]): boolean {
  return keys.every((key, i) => i === 0 || keys[i - 1] < key);
}

/** PW-81: both dictionaries complete, consistent and sorted. Fails `pnpm test` (and CI) otherwise. */
describe("i18n dictionaries", () => {
  const enKeys = Object.keys(en);
  const bnKeys = Object.keys(bn);
  const enMap = en as Record<string, string>;
  const bnMap = bn as Record<string, string>;

  it("have exactly the same keys", () => {
    const enSet = new Set(enKeys);
    const bnSet = new Set(bnKeys);
    expect(
      enKeys.filter((k) => !bnSet.has(k)),
      "missing from bn.json",
    ).toEqual([]);
    expect(
      bnKeys.filter((k) => !enSet.has(k)),
      "missing from en.json",
    ).toEqual([]);
  });

  it("have no empty values", () => {
    expect(
      enKeys.filter((k) => enMap[k].trim() === ""),
      "empty in en.json",
    ).toEqual([]);
    expect(
      bnKeys.filter((k) => bnMap[k].trim() === ""),
      "empty in bn.json",
    ).toEqual([]);
  });

  it("use the same {placeholders} in both languages", () => {
    const mismatched = enKeys.filter(
      (k) => k in bnMap && placeholders(enMap[k]).join(",") !== placeholders(bnMap[k]).join(","),
    );
    expect(mismatched).toEqual([]);
  });

  it("are sorted by full key in code-point order", () => {
    expect(isCodePointSorted(enKeys), "en.json order").toBe(true);
    expect(isCodePointSorted(bnKeys), "bn.json order").toBe(true);
  });
});
