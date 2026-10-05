# Slice #2: Product management in the dashboard

**GitHub issue:** #2 · **Branch:** `feat/2-products` · **i18n namespace:** `products.*, taxonomy.*`

## Goal
The owner can add, edit, publish, archive and delete products with photos, and manage the category, occasion and tag lists, all from `/admin` on her phone or laptop.

## SRS requirements
| ID | Requirement | Priority |
| --- | --- | --- |
| OD-10 | Create, edit, delete, archive products | M |
| OD-11 | Upload multiple images per product with drag-and-drop reorder; automatic resize/compression | M |
| OD-12 | Assign categories, occasions and tags; manage these lists | M |
| OD-13 | Mark as featured; draft vs published | M |
| OD-14 | Personalisation options field (checklist + free text) | M |
| OD-15 | Bulk actions (publish, archive, delete) | S |
| OD-16 | Live preview of the public product page | S |
| OD-17 | Duplicate a product | C |

Full text: `docs/SRS.md`.

## Dependencies
- **Must be merged first:** #1 Foundation (merged)
- **Can run in parallel with:** #4 Booking engine, #10 Content pages, #12 Customer gallery (after the image pipeline here is merged)
- **Unblocks:** #3 Catalogue (needs product data and queries), #12 Gallery (reuses the image pipeline), #7, #8, #9 indirectly

## Files you own (create and change freely)
- `src/app/admin/(dashboard)/products/**` (list, new, `[id]` edit, `taxonomy`)
- `src/actions/products.ts`, `product-images.ts`, `taxonomy.ts` (+ `*.test.ts`)
- `src/db/queries/products.ts` (admin reads), `taxonomy.ts`
- `src/lib/validators/products.ts`, `product-images.ts`, `taxonomy.ts`
- Image and storage helpers reused by later slices: `src/lib/images.ts`, `client-image.ts`, `storage.ts`, `storage.server.ts`, `src/lib/supabase/admin.ts`
- `src/lib/slug.ts`, `slugify.ts`
- `src/components/admin/product-*.tsx`, `taxonomy-list.tsx`, `src/components/shared/confirm-dialog.tsx`
- `e2e/admin-products.spec.ts`, shared test helpers `e2e/helpers.ts` and `src/test/`

## Shared files you may touch (follow `docs/WORKFLOW.md` section 6)
- `src/lib/i18n/en.json`, `bn.json` (add keys in your namespace, alphabetical)
- `docs/DECISIONS.md` (append)
- `src/components/admin/admin-nav.tsx` (add the Products link)
- `package.json` / lockfile (image library, drag-and-drop library)

Everything else belongs to another slice or the foundation: don't change it. Ask the lead if you need to.

## Data
- **Tables and storage:** products, product_images, product_occasions, product_tags, categories, occasions, tags. Storage bucket `product-images`.
- **Schema changes:** None expected. The tables exist from #1.

## Build plan
1. Admin queries: list products with search and status filter; get one product with images, occasions, tags.
2. Zod validators for product create/edit (EN + BN fields, personalisation options, turnaround days, featured, status) and taxonomy items.
3. Image pipeline in `src/lib/images.ts` and `storage.server.ts`: server-side resize to max 1600px plus a 400px thumbnail, upload both to `product-images`, return paths and dimensions. Alt text required. Keep it generic so #12 and #4 can reuse it.
4. Server actions: create, update, archive, delete, duplicate, bulk publish/archive, reorder images, taxonomy CRUD. Each starts with `requireOwner()`.
5. Slug generation from the title, unique, editable.
6. Dashboard UI: product list, product form, image manager (drag to reorder), taxonomy pages, nav links.
7. Tests: Vitest for every action; Playwright create → edit → delete.

## Watch out for
- Drafts and archived products must never be readable by public code. Admin queries live here; public queries belong to #3.
- Choose an image library that runs on Netlify's Node runtime and say so in the plan.
- Phone photos can be 5–10 MB: set a sensible upload size limit and show progress or a clear error.

## Done when
- [ ] Owner creates a product with 3+ photos from a phone-width screen
- [ ] Drag-to-reorder images persists
- [ ] Draft and archived products don't appear on any public page
- [ ] Categories, occasions and tags can be added, renamed, removed
- [ ] Bulk publish/archive works on several products
- [ ] Every action has a Vitest test; Playwright create/edit/delete passes
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass and CI is green
- [ ] Works at phone width and by keyboard

## Hand-off to later slices
Exports for later slices: image and storage helpers in `src/lib/images.ts` / `storage.server.ts` (used by #4 and #12), slug helpers, the confirm dialog, e2e helpers, and a stable products data model (used by #3).
