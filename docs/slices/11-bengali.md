# Slice #11: English / Bengali language completion

**GitHub issue:** #11 · **Branch:** `feat/11-bengali` · **i18n namespace:** `all (filling `bn.json`)`

## Goal
Every part of the site works fully in Bengali: all interface text translated, Bengali fields for owner content, correct fonts and metadata.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-80 | English / Bengali toggle, persisted for the visitor | M |
| PW-81 | All UI strings translated; product content translated where the owner provides it, otherwise falls back to English | M |
| PW-82 | Bengali rendered with a proper font (Noto Sans Bengali or similar) | M |
| OD-36 | Edit Bengali translations of product content | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** Most public and admin slices merged (#3, #4, #6, #7, #8, #9, #10), Client answer on translation scope
- **Can run in parallel with:** #13, #14
- **Unblocks:** #15 audit

## Files you own (create and change freely)
- `src/lib/i18n/bn.json` (complete it)
- `src/lib/i18n/**` helpers
- Bengali input fields in owner forms (small additions in each form; coordinate timing with the lead)

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- Admin forms from other slices: add `_bn` field inputs only
- `src/app/layout.tsx` (lang / hreflang metadata)
- `docs/DECISIONS.md`

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** All `_bn` columns.
- **Schema changes:** None.

## Build plan (as built)
1. Completeness checks in `pnpm test`: same keys in both dictionaries, no empty values, matching `{placeholders}`, code-point sort order (`src/lib/i18n/dictionaries.test.ts`).
2. Hard-coded visible text check in `pnpm test` (`src/lib/i18n/hardcoded-text.test.ts`, allowlist in `allowed-text.ts`): JSX text and `alt` / `aria-label` / `placeholder` / `title` literals in `src/app` and `src/components`.
3. OD-36: every `_bn` column has an input directly under its English field with a "বাংলা" badge and `lang="bn"`; one fallback helper `localised()` in `src/lib/i18n/localised.ts` used everywhere a `_bn` value is shown.
4. PW-80: cookie-persisted toggle (unchanged) plus `?lang=en|bn` served directly by the proxy for hreflang; per-language description and `og:locale`; hreflang alternates on every public page through `pageMetadata()`.
5. Dates in the visitor's language (`formatMelbourneFor`, Bengali digits and months); prices keep Latin digits.
6. WebKit Playwright project scoped to `e2e/bengali.spec.ts` (fonts, conjuncts, toggle persistence, `?lang=`), WebKit installed in CI.
7. Reviewed corrections applied with `scripts/i18n/apply-bn-fixes.ts` as the last commit.

## Watch out for
- Touches many files: schedule it when few other branches are open, to avoid conflicts.
- Machine translation must be reviewed by a Bengali speaker before launch.

## Needs client input
Full site or main pages only; who writes the Bengali.

If the answer isn't in yet, build with sensible defaults the owner can change, and note them in the PR.

## Done when
- [ ] No hard-coded visible English (check passes)
- [ ] Bengali conjuncts render correctly on iOS Safari and Android Chrome
- [ ] Owner can enter Bengali for products, FAQs, testimonials, settings
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
- #15 audit: the generated shadcn primitives (`src/components/ui/dialog.tsx`, `sheet.tsx`) carry an sr-only "Close" label in English; the hard-coded-text check skips `src/components/ui`. Localise or override when the audit touches those components.
