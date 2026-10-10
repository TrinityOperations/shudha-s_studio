import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ALLOWED_TEXT, ALLOWED_TEXT_PREFIXES, SKIPPED_PATH_FRAGMENTS } from "./allowed-text";

const ROOTS = ["src/app", "src/components"];
const VISIBLE_PROPS = new Set(["alt", "aria-label", "placeholder", "title"]);
const LETTERS = /\p{L}/u;
const BANGLA_ONLY = /^[\p{Script=Bengali}\p{P}\p{Zs}\d]+$/u;

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) listFiles(path, out);
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

function isAllowed(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed === "" || !LETTERS.test(trimmed)) return true;
  if (ALLOWED_TEXT.has(trimmed)) return true;
  if (ALLOWED_TEXT_PREFIXES.some((p) => trimmed.startsWith(p) && trimmed.length <= 4)) return true;
  // Bangla script literals are content in the owner's language (hero line, signature, toggle).
  if (BANGLA_ONLY.test(trimmed)) return true;
  return false;
}

type Finding = { file: string; line: number; text: string };

/** JSX text and visible string props that are literals rather than `t(...)` results. */
function scan(file: string): Finding[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const findings: Finding[] = [];
  const report = (node: ts.Node, text: string) => {
    if (isAllowed(text)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    findings.push({
      file: relative(process.cwd(), file),
      line: line + 1,
      text: text.replace(/\s+/g, " ").trim(),
    });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) report(node, node.text);
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText();
      if (VISIBLE_PROPS.has(name)) {
        if (ts.isStringLiteral(node.initializer)) report(node, node.initializer.text);
        else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          (ts.isStringLiteral(node.initializer.expression) ||
            ts.isNoSubstitutionTemplateLiteral(node.initializer.expression))
        )
          report(node, node.initializer.expression.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

/** PW-81: no hard-coded visible English in the app or its components. */
describe("hard-coded visible text", () => {
  it("is absent from src/app and src/components", () => {
    const files = ROOTS.flatMap((root) => listFiles(root)).filter(
      (file) => !SKIPPED_PATH_FRAGMENTS.some((fragment) => file.includes(fragment)),
    );
    const findings = files.flatMap(scan);
    expect(
      findings.map((f) => `${f.file}:${f.line}  "${f.text}"`),
      "move these to t() keys or add them to allowed-text.ts",
    ).toEqual([]);
  });
});
