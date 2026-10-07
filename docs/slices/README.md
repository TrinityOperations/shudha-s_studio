# Build slices: map, order and ownership

Each slice is one GitHub issue, one branch and one pull request. Pick up a slice with `docs/WORKFLOW.md`; everything specific to a slice is in its card below. Slice #1 (Foundation) is already merged.

## Slices
| # | Slice | Card | Depends on | Needs client |
| --- | --- | --- | --- | --- |
| 2 | Product management in the dashboard | [`02-product-management.md`](02-product-management.md) | #1 Foundation | – |
| 3 | Public catalogue and product page (contains migration: starting price) | [`03-public-catalogue.md`](03-public-catalogue.md) | #2 Product management | – |
| 4 | Availability settings and booking engine | [`04-booking-engine.md`](04-booking-engine.md) | #1 Foundation | Yes |
| 5 | Booking emails: confirmations, notifications, reminders | [`05-booking-emails.md`](05-booking-emails.md) | #4 Booking engine | – |
| 6 | Booking management in the dashboard | [`06-booking-management.md`](06-booking-management.md) | #4 Booking engine, #5 Booking emails | – |
| 7 | Custom order wizard | [`07-custom-order-wizard.md`](07-custom-order-wizard.md) | #3 Catalogue, #4 Booking engine | – |
| 8 | Wishlist / mood board | [`08-wishlist.md`](08-wishlist.md) | #3 Catalogue, #4 Booking engine | – |
| 9 | Home page and visual design pass | [`09-home-and-design.md`](09-home-and-design.md) | #3 Catalogue, Client meeting answers on look and feel | Yes |
| 10 | Content pages and site settings | [`10-content-pages.md`](10-content-pages.md) | #1 Foundation | Yes |
| 11 | English / Bengali language completion | [`11-bengali.md`](11-bengali.md) | Most public and admin slices merged, Client answer on translation scope | Yes |
| 12 | Customer gallery (happy customers) | [`12-customer-gallery.md`](12-customer-gallery.md) | #1 Foundation, #2 image pipeline | Yes |
| 13 | Seasonal theming | [`13-seasonal-theming.md`](13-seasonal-theming.md) | #9 Home and design, Client answer on which seasons | Yes |
| 14 | PWA dashboard and push notifications | [`14-pwa-push.md`](14-pwa-push.md) | #6 Booking management, #12 Customer gallery | – |
| 15 | Performance, accessibility and SEO pass | [`15-quality-pass.md`](15-quality-pass.md) | All feature slices merged | – |
| 16 | Handover: owner's guide and training | [`16-handover.md`](16-handover.md) | #15 Quality pass | Yes |

## Build order (waves)
Slices in the same wave can run in parallel, one person each. Start a slice only when everything in its "Depends on" is merged.

| Wave | Slices | Why together |
| --- | --- | --- |
| 1 | #2 Products · #4 Booking engine · #10 Content pages | Only need the foundation; they own separate folders |
| 2 | #3 Catalogue · #5 Booking emails · #12 Gallery | Each builds on one wave-1 slice |
| 3 | #6 Booking management · #7 Wizard · #8 Wishlist · #9 Home and design | Need catalogue and booking; #9 needs the client's design answers |
| 4 | #11 Bengali · #13 Themes · #14 PWA and push | Need most features in place |
| 5 | #15 Quality pass, then #16 Handover | Final polish with other work frozen |

```
#1 Foundation ─┬─ #2 Products ─┬─ #3 Catalogue ─┬─ #7 Wizard
               │               │                ├─ #8 Wishlist
               │               │                └─ #9 Home/design ── #13 Themes
               │               └─ #12 Gallery ──────────────────┐
               ├─ #4 Booking ──┬─ #5 Emails ─── #6 Booking mgmt ┴─ #14 PWA/push
               │               └─ (#7, #8 also need #4)
               └─ #10 Content pages
#11 Bengali after most slices · #15 Quality pass after all · #16 Handover last
```

## Lead tasks
1. ~~Merge #2~~ (done: PR #19).
2. Sort `en.json` and `bn.json` by key once (command in `docs/WORKFLOW.md` section 6), in its own small PR, so the alphabetical rule holds from then on.
3. Assign each wave-1 slice on the board and post the slice owner list to the team.
4. Update GitHub issues #3–#10 so their text matches the v1.0 cards (starting price, WhatsApp, delivery note, business orders).
5. When the client sends her product spreadsheet: one-off import into **draft** products (OD-52) with a script in `scripts/`, run against the shared project after a backup. She then adds photos and publishes.

## Shared helpers already on main
`src/lib/whatsapp.ts` (`normaliseWhatsAppNumber`, `whatsappLink`) and `whatsappNumberSchema` in `src/lib/validators/common.ts`. Every WhatsApp link in the app uses them (AGENTS.md rule 13).

## Who owns which top-level area
| Area | Owner slice |
| --- | --- |
| admin `products` (incl. taxonomy), `src/lib/images.ts`, `storage*.ts`, `slug*.ts` | #2 |
| `src/app/(public)/products`, `src/db/queries/catalogue.ts` | #3 |
| `src/lib/booking`, `src/app/(public)/book`, admin `availability` | #4 |
| `src/emails`, `src/lib/email.ts`, booking manage page, reminders cron | #5 |
| admin `bookings` | #6 |
| `src/app/(public)/custom-order` | #7 |
| `src/lib/wishlist`, `src/app/(public)/wishlist` | #8 |
| home page, public layout, header/footer, `globals.css` tokens | #9 |
| about/how-it-works/contact/faq/privacy/terms, admin settings/faqs/testimonials | #10 |
| `bn.json` completion | #11 |
| `src/app/(public)/gallery`, admin `gallery` | #12 |
| `src/lib/themes`, theme picker | #13 |
| manifest, service worker, `src/lib/push` | #14 |
| foundation files (auth, proxy, db client, schema, i18n helpers, ui) | Lead only |

## Shared hotspots
`en.json`/`bn.json`, `admin-nav.tsx`, `e2e/helpers.ts`, `package.json`/lockfile, `docs/DECISIONS.md`, `.env.example`, `src/db/schema.ts` + `drizzle/`. Rules for each are in `docs/WORKFLOW.md` section 6.
