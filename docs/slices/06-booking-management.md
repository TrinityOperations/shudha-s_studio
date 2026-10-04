# Slice #6: Booking management in the dashboard

**GitHub issue:** #6 · **Branch:** `feat/6-booking-management` · **i18n namespace:** `adminBookings.*`

## Goal
The owner sees all bookings in a calendar and list, confirms, reschedules or cancels them, keeps private notes, and replies quickly by WhatsApp or email.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| OD-20 | Calendar and list view of bookings (upcoming, past, cancelled) | M |
| OD-23 | Booking status (New, Confirmed, Done, Cancelled) and private notes | M |
| OD-24 | One-tap reply to the customer by WhatsApp/email from the booking | S |
| OD-25 | Google Calendar sync | S |
| OD-26 | View the custom-order brief and attached wishlist on each booking | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #4 Booking engine (merged), #5 Booking emails (merged)
- **Can run in parallel with:** #7 Wizard, #8 Wishlist, #9 Home page
- **Unblocks:** #14 PWA push notifications

## Files you own (create and change freely)
- `src/app/admin/(dashboard)/bookings/**`
- `src/actions/admin-bookings.ts` (+ tests)
- `src/db/queries/bookings.ts`
- `src/components/admin/bookings/**`
- `e2e/admin-bookings.spec.ts`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/components/admin/admin-nav.tsx` (add Bookings link)
- `src/app/admin/(dashboard)/page.tsx` (optional: upcoming bookings summary)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** bookings, products. Signed URLs for `booking-uploads`.
- **Schema changes:** None.

## Build plan
1. Queries: list (upcoming, past, cancelled), calendar range, one booking with product.
2. Calendar and list views at phone width.
3. Detail view: customer info, status (New, Confirmed, Done, Cancelled), private notes, reference image via signed URL, custom-order brief and wishlist display (render whatever `brief` / `wishlist_product_ids` contain; #7 and #8 fill them).
4. Actions: confirm, reschedule (reuse slot logic), cancel, mark done, save notes; each sends the matching email from #5.
5. One-tap WhatsApp (`wa.me` link) and email reply.
6. Google Calendar sync is S priority: propose separately, don't block the slice.

## Watch out for
- Customer data is only visible to the owner: `requireOwner()` on every page and action.
- Signed URLs for private images expire; don't store them.

## Done when
- [ ] Owner confirms, reschedules and cancels from a phone
- [ ] Each change emails the customer
- [ ] Brief and wishlist sections display when present
- [ ] Every action tested
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Booking detail view is where #7's brief and #8's wishlist appear.
