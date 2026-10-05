# Slice #15: Performance, accessibility and SEO pass

**GitHub issue:** #15 · **Branch:** `feat/15-quality` · **i18n namespace:** `seo.*, overview.*`

## Goal
Every public page is fast, accessible and well indexed before launch.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| NF-01 | Lighthouse performance ≥ 90 on mobile; LCP under 2.5 s on 4G; WebP/AVIF responsive images | – |
| NF-02 | Usable from 360 px phones to 4K; touch-friendly gallery and calendar | – |
| NF-03 | WCAG 2.2 AA; keyboard navigation; alt text prompted on upload; reduced-motion support | – |
| NF-04 | Server-rendered pages, per-product meta and Open Graph images, sitemap, LocalBusiness + Product structured data | – |
| NF-11 | Latest two versions of major browsers plus in-app Facebook/Instagram browsers | – |
| NF-12 | Privacy-friendly analytics visible in the dashboard | – |
| OD-40 | Overview: bookings this week, most viewed products, enquiries by category | S |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** All feature slices merged (#2–#14)
- **Can run in parallel with:** None: freeze other feature work while this runs
- **Unblocks:** #16 Handover

## Files you own (create and change freely)
- `src/app/sitemap.ts`, `src/app/robots.ts`, structured data components
- Analytics integration (Umami) and dashboard overview (OD-40)
- Fixes anywhere, coordinated with the lead

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- Any file, with small targeted fixes only

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** product_view_stats, bookings (overview counts).
- **Schema changes:** None.

## Build plan
1. Lighthouse audit of every public page on mobile; fix regressions.
2. Keyboard and screen-reader walk-through of booking and wizard.
3. Sitemap, robots, LocalBusiness and Product structured data.
4. Test in Facebook and Instagram in-app browsers.
5. Umami analytics; dashboard overview (bookings this week, most viewed products).

## Watch out for
- Small, separate commits per fix make review easy.

## Done when
- [ ] Performance ≥ 90 and accessibility ≥ 95 on all public pages (mobile)
- [ ] Structured data passes Google's Rich Results test
- [ ] Works in Facebook/Instagram in-app browsers
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Launch readiness.
