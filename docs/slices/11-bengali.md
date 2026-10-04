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

## Build plan
1. Script or test that lists keys missing from `bn.json`.
2. Fill `bn.json` (from client-provided or reviewed translations).
3. Make sure every owner form has the `_bn` inputs from OD-36.
4. Lint rule or test that flags hard-coded visible English in components.
5. `hreflang`, per-language metadata, font loading checked on iOS Safari and Android Chrome.

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
None.
