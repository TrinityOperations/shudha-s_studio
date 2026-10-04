# Slice #5: Booking emails: confirmations, notifications, reminders

**GitHub issue:** #5 · **Branch:** `feat/5-booking-emails` · **i18n namespace:** `emails.*, bookingManage.*`

## Goal
Every booking event sends the right branded email to the right person, plus a day-before reminder and a secure link for customers to reschedule or cancel.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-34 | Confirmation screen + confirmation email to customer | M |
| PW-35 | Notification to owner (email; optionally push/SMS/WhatsApp) | M |
| PW-36 | Reminder to customer before the appointment | S |
| PW-37 | Customer can reschedule/cancel via a secure link in the email | S |
| OD-22 | Confirm, reschedule, cancel bookings; customer gets an email | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #4 Booking engine (merged)
- **Can run in parallel with:** #3 Catalogue, #12 Gallery
- **Unblocks:** #6 Booking management (owner actions send these emails)

## Files you own (create and change freely)
- `src/emails/**` (React Email templates, EN + BN)
- `src/lib/email.ts` (send helper over Resend)
- `src/app/(public)/booking/manage/[token]/**` (customer reschedule/cancel page)
- `src/app/api/cron/reminders/route.ts` (day-before reminders)
- `src/actions/booking-manage.ts` (+ tests)

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/lib/booking/**` (only to call the email hook added in #4)
- `netlify.toml` (scheduled function for reminders)
- `.env.example` (e.g. `CRON_SECRET`)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** bookings (manage_token, reminder_sent_at, status timestamps).
- **Schema changes:** None expected.

## Build plan
1. Templates: customer confirmation (with .ics attachment), owner new-booking notification, reminder, rescheduled, cancelled.
2. Send helper with a dev mode that logs instead of sending when no Resend key is set.
3. Wire `onBookingCreated` from #4 to send confirmation + owner notification.
4. Manage page via `manage_token`: reschedule (reuses slot logic) or cancel; token expires after the appointment and rotates after use.
5. Reminder job: protected by a secret, sends reminders for bookings starting in ~24h, sets `reminder_sent_at` so it never double-sends. Schedule it on Netlify.
6. Tests for each send path with Resend mocked.

## Watch out for
- Until the client's domain is verified in Resend, only sandbox sending works; keep the sender configurable.
- Don't leak other customers' data on the manage page; token lookups only.

## Done when
- [ ] Every booking state change emails the right person
- [ ] Manage link can't be reused or guessed
- [ ] Reminder job is idempotent (tested)
- [ ] Emails render in both languages
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Exports email send helpers used by #6.
