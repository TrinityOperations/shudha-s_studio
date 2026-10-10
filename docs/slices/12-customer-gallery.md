# Slice #12: Customer gallery (happy customers)

**GitHub issue:** #12 · **Branch:** `feat/12-gallery` · **i18n namespace:** `gallery.*` (public), `admin.gallery.*` (dashboard)

## Goal
Customers submit photos of their gifts; the owner approves them before they appear on a public "happy customers" page.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-70 | "Happy customers" page with photos submitted by customers | M |
| PW-71 | Submission form: photo, first name (optional), short note, consent checkbox | M |
| PW-72 | Nothing appears publicly until the owner approves it in the dashboard | M |
| OD-32 | Approve, hide or delete customer gallery submissions | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #1 Foundation (merged), #2 image pipeline (merged)
- **Can run in parallel with:** #3, #5
- **Unblocks:** #14 push notification for new submissions

## Files you own (create and change freely)
- `src/app/(public)/gallery/**`
- `src/app/admin/(dashboard)/gallery/**`
- `src/actions/gallery.ts` (+ tests)
- `src/db/queries/gallery.ts`
- `src/lib/validators/gallery.ts`
- `src/components/public/gallery/**`, `src/components/admin/gallery/**`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/components/admin/admin-nav.tsx` (Gallery link)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** gallery_submissions. Buckets: `gallery-pending` (private) → `gallery-images` (public) on approval.
- **Schema changes:** None.

## Build plan
1. Public submission form: photo, optional first name, note, required consent, Turnstile.
2. Upload to the private `gallery-pending` bucket using the helpers in `src/lib/images.ts` / `storage.server.ts` from #2; strip EXIF location data.
3. Moderation queue: approve (copy to `gallery-images`), hide, delete.
4. Public gallery shows approved items only.

## Watch out for
- Nothing appears publicly without approval (tested).
- Pending photos are never in a public bucket.

## Needs client input
Permission wording for consent; whether names are shown.

If the answer isn't in yet, build with sensible defaults the owner can change, and note them in the PR.

## Done when
- [x] Unapproved photos never visible publicly (tested: unit + e2e)
- [x] EXIF location stripped (unit test with GPS tags)
- [x] Owner approves from a phone (e2e mobile project, 44px buttons)
- [x] `pnpm lint && pnpm typecheck && pnpm test` pass (CI on the PR)
- [x] Works at phone width and by keyboard (e2e submits by keyboard)

## Hand-off to later slices
`onGallerySubmitted` in `src/lib/gallery/hooks.ts` is where #14 adds the push notification (marked in the code). #14's nav redesign moves Gallery under More.

Note for whoever touches hide/delete: Supabase's CDN can keep serving a deleted public file for up to about a minute after Hide, so "hidden" means gone from the site immediately and from the public URL within a minute. Delete has the same lag.
