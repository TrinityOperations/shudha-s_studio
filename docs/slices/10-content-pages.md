# Slice #10: Content pages and site settings

**GitHub issue:** #10 · **Branch:** `feat/10-content-pages` · **i18n namespace:** `pages.*, contact.*, faq.*` (public), `admin.settings.*, admin.faqs.*, admin.testimonials.*` (dashboard)

## Goal
About, How it works, Contact, FAQ, Privacy, Terms and a branded 404 page, all editable by the owner from the dashboard.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-40 | About page: the owner's story, Bangladeshi heritage, handmade quality | M |
| PW-41 | How it works page (browse → book → consult → create → pickup or post) | M |
| PW-42 | Contact page with form, WhatsApp, social links, area served | M |
| PW-43 | FAQ page | S |
| PW-44 | Gallery / lookbook separate from the catalogue | C |
| PW-45 | Privacy policy and terms pages | M |
| PW-46 | Branded 404 page | S |
| PW-48 | Delivery note on How it works and the FAQ (pickup or post Australia-wide, arranged in the consultation; #3 shows it on product pages) | M |
| OD-30 | Edit hero text, about text, FAQ, contact details (WhatsApp number, email), social links, delivery note | M |
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
- `src/app/admin/(dashboard)/settings/**` (hub, content, announcement, banner, faqs, testimonials, account), `src/app/admin/home-editor/**`
- `src/actions/settings.ts` (extend), `faqs.ts`, `testimonials.ts`, `contact.ts`, `site-images.ts`, `home-editor.ts`, `account.ts` (+ tests)
- `src/db/queries/settings.ts` (extend), `faqs.ts`, `testimonials.ts`
- `src/lib/validators/settings.ts` (extend), `faqs.ts`, `testimonials.ts`, `contact.ts`
- `src/components/public/pages/**`, `src/components/admin/content/**`, `src/components/admin/home-editor/**`, `src/lib/home-editor/**`, `src/lib/site-images.server.ts`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/components/admin/admin-nav.tsx` (FAQs, Testimonials links)
- `src/app/(public)/layout.tsx` (announcement banner only, one insert)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** site_settings, faqs, testimonials, contact_messages.
- **Schema changes:** None.

## Build plan (as built)
1. Settings keys read by the pages: `about`, `delivery`, `social`, `contact` (from #5), `legal`, `announcement` (with an on/off switch), `seasonal_banner`, `home` (draft + published, from #9). Schemas in `src/lib/validators/settings.ts`, readers in `src/db/queries/settings.ts`.
2. Public pages: `/about`, `/how-it-works` (with `#delivery`), `/delivery` → redirect, `/contact`, `/faq`, `/privacy`, `/terms`, branded `not-found.tsx`. The delivery note overrides the product page's built-in line when filled.
3. Contact form: Turnstile, the shared rate limiter (`contact:` bucket), `contact_messages`, owner email through `src/lib/email.ts` (dry run locally).
4. Dashboard under `/admin/settings/*`: Content (story, delivery note, contact, social, legal), Announcement, Seasonal banner, FAQs, Testimonials (with photo), Account (password only).
5. Home page editor at `/admin/home-editor` (docs/design.md, "Home page editor"): editing bar, slot overlays via `SlotFrame`, the picker panel (From products / Upload with crop preview), upload as just-a-photo or as a new product through the product form, hero video via signed direct upload, Save / Discard / Exit.
6. Migration `0004_site_images_video.sql`: `video/mp4` allowed in `site-images`.

## Watch out for
- Every visible text on these pages comes from settings or `t()`, never hard-coded.
- PW-44 lookbook is C priority: skip unless trivial.

## Needs client input
Her About text (her story, Bangladeshi heritage, handmade), FAQ answers, contact details including her WhatsApp number, testimonials permission. Seed the FAQ with a delivery question: "Do you deliver?" → pickup or post Australia-wide, arranged during the consultation.

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
