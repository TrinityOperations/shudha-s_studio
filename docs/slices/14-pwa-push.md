# Slice #14: PWA dashboard and push notifications

**GitHub issue:** #14 · **Branch:** `feat/14-pwa` · **i18n namespace:** `push.*`

## Goal
The owner installs the dashboard on her phone like an app and gets a push notification for each new booking and gallery submission.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| OD-60 | Dashboard installable on the owner's phone (manifest, icons, offline shell) | M |
| OD-61 | Push notification on new booking and new gallery submission | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #6 Booking management (merged), #12 Customer gallery (merged)
- **Can run in parallel with:** #11, #13

## Files you own (create and change freely)
- `src/app/manifest.ts`, `public/icons/**`, service worker file
- `src/lib/push/**`
- `src/actions/push.ts` (+ tests)
- `src/components/admin/push/**` (enable notifications button)

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- Booking-created hook (#4/#5) and gallery-submitted hook (#12): one call each to send a push
- `.env.example` (VAPID public/private keys)
- `docs/DECISIONS.md`
- `src/lib/i18n/en.json`, `bn.json`

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** push_subscriptions.
- **Schema changes:** None.

## Build plan
1. Web app manifest, icons, offline shell for `/admin`.
2. Subscribe/unsubscribe the owner's device (VAPID).
3. Send push on new booking and new gallery submission; remove dead subscriptions.
4. Test on iPhone (Add to Home Screen) and Android.

## Watch out for
- iOS only allows push for installed home-screen apps.
- Service worker must not cache admin data responses.

## Done when
- [ ] Installs on iPhone and Android
- [ ] Push arrives within a minute of a new booking
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
None.
