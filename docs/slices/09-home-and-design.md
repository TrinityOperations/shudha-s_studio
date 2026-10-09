# Slice #9: Home page and visual design pass

**GitHub issue:** #9 · **Branch:** `feat/9-home-design` · **i18n namespace:** `home.*`

## Goal
The home page and the site's look (colours, type, spacing, motion) feel artistic and personal, matching the client's taste.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| PW-01 | Hero with studio name, tagline ("Be a reason for someone's happiness & more") and a Book an Appointment call to action | M |
| PW-02 | Featured / latest products grid, curated by the owner | M |
| PW-03 | Shop-by-occasion shortcuts (Birthday, Anniversary, Wedding, Christmas, New Year, Corporate, Eid; the owner manages the list) | M |
| PW-04 | Shop-by-category shortcuts (Chocolate wrappers, Nameplates, Cards, Posters, Mugs, Apparel, Home decor, Keyrings, Cushions, Gift packs; the owner manages the list) | M |
| PW-05 | About the maker section with photo and her story (handmade, Bangladeshi heritage) | M |
| PW-06 | Customer testimonials carousel | S |
| PW-07 | Instagram / Facebook links or feed | S |
| PW-08 | Scroll-driven animations and smooth page transitions, respecting reduced-motion | S |
| PW-09 | Signature designs section: products carrying the owner's "signature" tag | S |
| PW-47 | WhatsApp chat button on every public page, opening a chat with the studio's number (click-to-chat link) | M |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #3 Catalogue (merged), Client meeting answers on look and feel
- **Can run in parallel with:** #6, #7, #8
- **Unblocks:** #13 Seasonal theming (builds on the design tokens)

## Files you own (create and change freely)
- `src/app/(public)/page.tsx`, `src/app/(public)/layout.tsx`
- `src/components/public/home/**`, `src/components/public/layout/**` (header, footer, announcement strip, WhatsApp button)
- `src/app/globals.css` (design tokens)
- `public/` brand images

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/db/queries/settings.ts` (read hero/about content; coordinate with #10 if it changes settings shape)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** products (featured), categories, occasions, testimonials, site_settings.
- **Schema changes:** None.

## Build plan
1. Design tokens in `globals.css`: palette, type scale, spacing, radii, from the client's chosen direction.
2. Hero with tagline and Book call to action; featured products (reuse `ProductCard`); shop-by-occasion and shop-by-category sections; about-the-maker (her story: handmade, Bangladeshi heritage); signature designs (published products tagged `signature`; hide the section when there are none); testimonials carousel; social links.
2b. WhatsApp chat button in the public layout on every page: `whatsappLink()` from `src/lib/whatsapp.ts` (on main) with the studio number from #10's contact settings; hidden when no number is set. Clear label, keyboard reachable, never covers page content on a 360px screen.
3. Framer Motion page transitions and scroll reveals; everything readable with reduced motion.
4. Images optimised with `next/image`; Lighthouse checks.

## Watch out for
- Get the design approved by the lead (and client) from a preview before polishing.
- Tokens must work for #13's themes: use CSS variables, no hard-coded colours in components.

## Needs client input
Colours, three-word feel, reference sites, logo file (she may refresh it), photos. Her story text for the About section.

If the answer isn't in yet, build with sensible defaults the owner can change, and note them in the PR.

## Done when
- [ ] Client approves the design
- [ ] Lighthouse mobile performance ≥ 90 and accessibility ≥ 95 on the home page
- [ ] No hard-coded colours outside tokens
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Design tokens used by #13.
