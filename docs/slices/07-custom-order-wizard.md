# Slice #7: Custom order wizard

**GitHub issue:** #7 · **Branch:** `feat/7-custom-order-wizard` · **i18n namespace:** `wizard.*`

## Goal
A step-by-step form collects everything the owner needs for a custom order (product, occasion, names, dates, photo, quantity, deadline) and ends by booking a slot, so she gets a structured brief instead of a vague message.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-50 | Multi-step wizard: product type → occasion → details (names, dates, message, language) → photo upload → quantity and needed-by date → book a slot | M |
| PW-51 | Wizard can start from a product page with the product pre-selected | M |
| PW-52 | Result is a structured brief attached to the booking, visible in the dashboard | M |
| PW-53 | Progress is kept if the customer navigates between steps; abandoned wizards are not stored | S |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #3 Catalogue (merged), #4 Booking engine (merged)
- **Can run in parallel with:** #6 Booking management, #8 Wishlist, #9 Home page

## Files you own (create and change freely)
- `src/app/(public)/custom-order/**`
- `src/components/public/wizard/**`
- `src/lib/validators/brief.ts` (matches the `CustomOrderBrief` type in the schema)
- `src/actions/custom-order.ts` (+ tests)
- `e2e/custom-order.spec.ts`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- Product page from #3: add one "Start a custom order" link (one line)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** bookings.brief (jsonb), products, categories, occasions. Photos to `booking-uploads`.
- **Schema changes:** None.

## Build plan
1. Steps: product type → occasion → details (names, dates, message, language) → photo upload → quantity and needed-by date → pick a slot and contact details.
2. Can start from a product page with the product preselected (`?product=`).
3. Keep progress in client state across steps (back/forward works); nothing is stored until the final submit.
4. Final submit calls #4's `createBooking()` with the brief attached.
5. Validate each step with Zod; re-validate everything on the server.

## Watch out for
- Reuse the booking slot picker from #4; don't build a second one.
- Works fully at 360px width.

## Done when
- [ ] Wizard completes on a 360px screen
- [ ] Back/forward keeps entered data
- [ ] Brief shows on the booking in the dashboard
- [ ] Playwright test for the full path
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
None.
