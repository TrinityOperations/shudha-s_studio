# Slice #10: Content pages and site settings

**GitHub issue:** #10 · **Branch:** `feat/10-content-pages` · **i18n namespace:** `pages.*, contact.*, faqs.*, testimonials.*, settings.*`

## Goal
About, How it works, Contact, FAQ, Privacy, Terms and a branded 404 page, all editable by the owner from the dashboard.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-40 | About page | M |
| PW-41 | How it works page (browse → book → consult → create → collect/deliver) | M |
| PW-42 | Contact page with form, social links, area served | M |
| PW-43 | FAQ page | S |
| PW-44 | Gallery / lookbook separate from the catalogue | C |
| PW-45 | Privacy policy and terms pages | M |
| PW-46 | Branded 404 page | S |
| OD-30 | Edit hero text, about text, FAQ, contact details, social links | M |
| OD-31 | Manage testimonials (add, hide, reorder) | S |
| OD-33 | Site-wide announcement banner toggle | S |
| OD-34 | Change own password and email | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #1 Foundation (merged)
- **Can run in parallel with:** #2 Products, #4 Booking engine
- **Unblocks:** #9 uses testimonials and about content

## Files you own (create and change freely)
- `src/app/(public)/{about,how-it-works,contact,faq,privacy,terms}/**`, `src/app/not-found.tsx`
- `src/app/admin/(dashboard)/settings/**` (extend: content, contact, social, announcement, account)
- `src/app/admin/(dashboard)/faqs/**`, `src/app/admin/(dashboard)/testimonials/**`
- `src/actions/settings.ts` (extend), `faqs.ts`, `testimonials.ts`, `contact.ts` (+ tests)
- `src/db/queries/settings.ts` (extend), `faqs.ts`, `testimonials.ts`
- `src/lib/validators/settings.ts` (extend), `faqs.ts`, `testimonials.ts`, `contact.ts`
- `src/components/public/pages/**`, `src/components/admin/content/**`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/components/admin/admin-nav.tsx` (FAQs, Testimonials links)
- `src/app/(public)/layout.tsx` (announcement banner only, one insert)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** site_settings, faqs, testimonials, contact_messages.
- **Schema changes:** None.

## Build plan
1. Settings keys for home, about, contact, social links, announcement banner (Zod-validated values).
2. Public pages reading from settings; FAQ page from `faqs`; branded 404.
3. Contact form with Turnstile, saving to `contact_messages` and emailing the owner (use #5's helper if merged, else store only).
4. Dashboard editors for settings, FAQs (reorder), testimonials (add, hide, reorder), change password/email.
5. Privacy and Terms as editable text with sensible starter content.

## Watch out for
- Every visible text on these pages comes from settings or `t()`, never hard-coded.
- PW-44 lookbook is C priority: skip unless trivial.

## Needs client input
Her About text, FAQ answers, contact details, testimonials permission.

If the answer isn't in yet, build with sensible defaults the owner can change, and note them in the PR.

## Done when
- [ ] Every editable text comes from the dashboard
- [ ] Contact form reaches the owner
- [ ] Announcement banner toggles on and off
- [ ] Tests for every action
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Testimonials and about content for #9.
