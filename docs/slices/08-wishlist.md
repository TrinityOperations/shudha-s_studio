# Slice #8: Wishlist / mood board

**GitHub issue:** #8 · **Branch:** `feat/8-wishlist` · **i18n namespace:** `wishlist.*`

## Goal
Visitors save products to a list without an account and send the whole list with one booking.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-60 | Customer can save products to a list without an account (stored in the browser) | M |
| PW-61 | Saved list can be attached to one booking in a single step | M |
| PW-62 | Shareable link to the list (e.g. for a wedding planner) | C |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #3 Catalogue (merged), #4 Booking engine (merged)
- **Can run in parallel with:** #6, #7, #9

## Files you own (create and change freely)
- `src/lib/wishlist/**` (browser storage helpers)
- `src/components/public/wishlist/**` (heart button, list view)
- `src/app/(public)/wishlist/**`
- `e2e/wishlist.spec.ts`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- Catalogue `ProductCard` and product page from #3: add the heart button (one component insert each)
- Booking form from #4: accept a wishlist and pass `wishlistProductIds` (small, coordinated change)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** bookings.wishlist_product_ids (uuid[]); products (read).
- **Schema changes:** None.

## Build plan
1. Wishlist stored in the browser (localStorage with a safe fallback when unavailable).
2. Heart/save button on product cards and product pages.
3. Wishlist page listing saved products; remove items; "Book a chat about these" goes to `/book` with the list attached.
4. Booking stores the product ids; dashboard shows them (#6 renders).
5. PW-62 shareable link is C priority: only if cheap.

## Watch out for
- No customer accounts in v1 (see DECISIONS).
- Deleted or unpublished products in a saved list must be skipped gracefully.

## Done when
- [ ] List survives reloads
- [ ] Attached list shows on the booking in the dashboard
- [ ] Unpublished products in a saved list are skipped
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
None.
