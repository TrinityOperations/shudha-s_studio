/**
 * Applies reviewed Bengali corrections to src/lib/i18n/bn.json.
 *
 *   pnpm tsx scripts/i18n/apply-bn-fixes.ts path/to/fixes.json
 *
 * The input is a flat object of key → corrected Bengali value. Matching keys are replaced, the
 * file is written back sorted (code-point order, the project convention), and keys that no
 * longer exist in bn.json are reported and skipped. Nothing else in the file changes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BN_PATH = resolve(process.cwd(), "src/lib/i18n/bn.json");
const input = process.argv[2];
if (!input) {
  console.error("Usage: pnpm tsx scripts/i18n/apply-bn-fixes.ts <fixes.json>");
  process.exit(1);
}

const fixes = JSON.parse(readFileSync(resolve(process.cwd(), input), "utf8")) as Record<
  string,
  unknown
>;
const bn = JSON.parse(readFileSync(BN_PATH, "utf8")) as Record<string, string>;

const changed: string[] = [];
const unchanged: string[] = [];
const unknown: string[] = [];
const invalid: string[] = [];
for (const [key, value] of Object.entries(fixes)) {
  if (typeof value !== "string" || value.trim() === "") {
    invalid.push(key);
    continue;
  }
  if (!(key in bn)) {
    unknown.push(key);
    continue;
  }
  if (bn[key] === value) unchanged.push(key);
  else {
    bn[key] = value;
    changed.push(key);
  }
}

const sorted = Object.fromEntries(
  Object.keys(bn)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((k) => [k, bn[k]]),
);
writeFileSync(BN_PATH, JSON.stringify(sorted, null, 2) + "\n");

console.log(`changed ${changed.length}, already identical ${unchanged.length}`);
if (unknown.length) console.log(`keys that no longer exist (skipped):\n  ${unknown.join("\n  ")}`);
if (invalid.length)
  console.log(`keys with an empty or non-string value (skipped):\n  ${invalid.join("\n  ")}`);
