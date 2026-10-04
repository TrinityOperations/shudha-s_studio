# Slice #4: Availability settings and booking engine

**GitHub issue:** #4 · **Branch:** `feat/4-booking-engine` · **i18n namespace:** `booking.*, availability.*`

## Goal
The owner sets her weekly hours and blocked dates; customers pick a free slot and book a consultation, with no possibility of double booking.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| OD-21 | Set weekly availability, slot length, buffer time, blocked dates/holidays | M |
| PW-30 | Booking form: name, phone, email, preferred date/time, product of interest, message, reference image upload | M |
| PW-31 | Calendar shows only the owner's available slots; past and blocked times hidden | M |
| PW-32 | Prevents double-booking (server-side conflict check in a transaction) | M |
| PW-33 | Choice of consultation type: in person, phone, video call (to confirm) | S |
| PW-38 | Spam protection (Turnstile, rate limiting) | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #1 Foundation (merged)
- **Can run in parallel with:** #2 Products, #10 Content pages
- **Unblocks:** #5 Emails, #6 Booking management, #7 Wizard, #8 Wishlist

## Files you own (create and change freely)
- `src/lib/booking/**` (rules → slots → conflict check)
- `src/app/(public)/book/**`
- `src/app/admin/(dashboard)/availability/**`
- `src/actions/availability.ts`, `src/actions/booking.ts` (public create booking) (+ tests)
- `src/db/queries/availability.ts`
- `src/lib/validators/booking.ts`, `src/lib/validators/availability.ts`
- `src/components/public/booking/**`, `src/components/admin/availability/**`
- `e2e/booking.spec.ts`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/components/admin/admin-nav.tsx` (add Availability link)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** booking_settings, availability_rules, blocked_periods, bookings. Storage bucket `booking-uploads` (private) for the reference image.
- **Schema changes:** None. The `bookings_no_overlap` exclusion constraint already exists.

## Build plan
1. Availability admin: weekly hours per weekday, slot length, buffer, booking horizon, minimum notice, consultation types, blocked periods.
2. `src/lib/booking`: generate slots from rules in Australia/Melbourne time, subtract blocked periods and existing bookings, respect minimum notice and horizon. Pure functions with thorough unit tests (including daylight-saving changeover).
3. Public `/book` page: slot picker, contact details, consultation type, product of interest (prefilled from `?product=`), message, optional reference image (private `booking-uploads` bucket via the helpers in `src/lib/images.ts` / `storage.server.ts` from #2).
4. Create-booking action: Turnstile → Zod → recompute the slot on the server → insert in a transaction → handle the exclusion-constraint error as "slot just taken".
5. Expose `createBooking()` and slot helpers so #5, #7 and #8 can call them.
6. Rate-limit the public action.

## Watch out for
- Never trust a slot from the client; always recompute on the server.
- Store UTC, display Melbourne time.
- Leave an obvious hook (e.g. an `onBookingCreated` call) where #5 will send emails; don't send emails here.

## Needs client input
Working hours, slot length, booking horizon and consultation types. Build them as dashboard settings with sensible defaults (Mon–Sat 10:00–18:00, 30-minute slots, 4-week horizon, 24h notice) so the client's answers are just settings changes.

If the answer isn't in yet, build with sensible defaults the owner can change, and note them in the PR.

## Done when
- [ ] Two simultaneous bookings for one slot: exactly one succeeds (test)
- [ ] Past, blocked and out-of-hours slots never shown
- [ ] Unit tests for slot generation, including DST changeover
- [ ] Owner can change hours and see the booking page update
- [ ] Booking works with Turnstile on a phone
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Exports `createBooking()`, slot generation, and the booking-created hook point for #5, #6, #7, #8.
