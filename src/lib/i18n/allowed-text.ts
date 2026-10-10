/**
 * Visible literals the hard-coded-text check accepts (src/lib/i18n/hardcoded-text.test.ts):
 * brand names, symbols and things that are the same in every language. Everything else that
 * a visitor or the owner can read must come from `t()`.
 */
export const ALLOWED_TEXT = new Set<string>([
  "S", // the logo mark placeholder until Shudha's logo arrives
  "404",
  "|",
  "·",
  "•",
  "—",
  "–",
  "+",
  "%",
  "#",
  "×",
  "(",
  ")",
  ",",
  ".",
  ":",
  "@",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "YouTube",
  "Umami",
]);

/** Prefixes of text that is allowed wherever it appears (units, codes). */
export const ALLOWED_TEXT_PREFIXES = ["+", "$", "#", "%", "×", "/"];

/** Files the check skips entirely: generated shadcn primitives. */
export const SKIPPED_PATH_FRAGMENTS = ["/components/ui/"];
