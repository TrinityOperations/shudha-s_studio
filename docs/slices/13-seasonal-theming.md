# Slice #13: Seasonal theming

**GitHub issue:** #13 · **Branch:** `feat/13-themes` · **i18n namespace:** `themes.*` (public), `admin.themes.*` (dashboard)

## Goal
The owner switches the whole site's look for a season (Eid, Christmas, Valentine's, Mother's Day) with one click, no deploy.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-90 | A small set of themes (default, Eid, Christmas, Valentine's, Mother's Day — to confirm) changing colours, hero imagery and accents | M |
| PW-91 | Theme is chosen by the owner from the dashboard; one click, no deploy | M |
| OD-35 | Choose the active seasonal theme | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #9 Home and design (merged), Client answer on which seasons
- **Can run in parallel with:** #11, #14

## Files you own (create and change freely)
- `src/lib/themes/**` (theme definitions)
- `src/components/admin/themes/**`, theme picker page under settings
- `src/app/globals.css` (theme variable sets only)

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/app/layout.tsx` (apply the active theme class/attribute)
- Settings action/validator from #10 (add the `theme` key)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** site_settings (`theme` key).
- **Schema changes:** None.

## Build plan
1. Theme definitions as CSS variable sets on top of #9's tokens, plus optional hero image and accents.
2. Owner picker in settings with previews.
3. Active theme read server-side and applied on every page; change visible within a minute.
4. Contrast check (WCAG AA) for every theme.

## Watch out for
- No hard-coded colours; only variables.
- Revalidate cached pages when the theme changes.

## Needs client input
Which seasons to include.

If the answer isn't in yet, build with sensible defaults the owner can change, and note them in the PR.

## Done when
- [ ] Switching theme updates the live site within a minute
- [ ] Every theme passes WCAG AA contrast
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
None.
