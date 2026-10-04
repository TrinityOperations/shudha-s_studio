# Slice #3: Public catalogue and product page

**GitHub issue:** #3 · **Branch:** `feat/3-catalogue` · **i18n namespace:** `catalogue.*`

## Goal
Visitors browse published products, filter by category, occasion and tag, search in English or Bengali, and open a product page with a photo gallery and a Book button.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-10 | Browse all products in a responsive masonry/grid gallery | M |
| PW-11 | Filter by category, occasion and tag; filters combine | M |
| PW-12 | Keyword search (English and Bengali text) | M |
| PW-13 | Sort by newest / featured | S |
| PW-14 | No prices shown anywhere on public pages | M |
| PW-15 | Paginated or infinite loading with lazy images | S |
| PW-20 | Image gallery with zoom and swipe on mobile | M |
| PW-21 | Title, description, category, occasion tags, material/size notes | M |
| PW-22 | Personalisation options shown as text (name, date, photo, language, etc.) | M |
| PW-23 | Typical turnaround time | S |
| PW-24 | Book an appointment button that pre-fills this product as the enquiry subject | M |
| PW-25 | Related products | S |
| PW-26 | Share buttons (WhatsApp, Facebook, copy link) | S |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #2 Product management (merged)
- **Can run in parallel with:** #5 Booking emails, #12 Customer gallery
- **Unblocks:** #7 Wizard, #8 Wishlist, #9 Home page (they reuse the product card and catalogue queries)

## Files you own (create and change freely)
- `src/app/(public)/products/**` (list and `[slug]` page)
- `src/db/queries/catalogue.ts` (public reads: published products only)
- `src/components/public/catalogue/**` (ProductCard, filters, gallery, share buttons)
- `src/lib/validators/catalogue.ts` (search/filter params)
- `e2e/catalogue.spec.ts`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** products, product_images, categories, occasions, tags, product_view_stats (increment views). Read only, except the view counter.
- **Schema changes:** None.

## Build plan
1. Public queries returning **published products only**, with filters (category, occasion, tag combined), keyword search across EN and BN title/description, sort (newest, featured), pagination.
2. Filters reflected in the URL search params so links are shareable.
3. Product grid with lazy-loaded `next/image` thumbnails; product card component exported for reuse.
4. Product page: gallery with zoom and swipe, details, personalisation options, turnaround, related products, share buttons (WhatsApp, Facebook, copy link).
5. "Book an appointment" button linking to `/book?product=<slug>` (the booking page itself is #4).
6. Per-product metadata and Open Graph image; increment `product_view_stats` for the day.
7. Tests: queries never return drafts; Playwright filter + open product.

## Watch out for
- No price field or text anywhere.
- Search must handle Bengali text; test with a Bengali title.
- The Book button only links; don't build booking logic here.

## Done when
- [ ] Filters and search work together and show in the URL
- [ ] Gallery works by keyboard and touch
- [ ] Drafts never appear (tested)
- [ ] Lighthouse mobile performance ≥ 90 on a product page
- [ ] Share buttons work on mobile
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Exports `ProductCard` and catalogue queries for #7, #8, #9.
