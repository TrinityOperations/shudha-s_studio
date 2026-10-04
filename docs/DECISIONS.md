# Decisions log

Append one dated line per non-obvious choice. Newest at the bottom.

- 2026-10-02: Stack chosen: Next.js 15 + Supabase + Drizzle + Tailwind/shadcn, hosted on Vercel. Reason: free at this scale, one codebase for site and dashboard, strong SEO via server rendering.
- 2026-10-02: v1 extras confirmed: custom order wizard, English/Bengali toggle, wishlist, customer gallery, PWA dashboard with push, seasonal theming. Everything else in SRS section 5 is deferred.
- 2026-10-02: No prices or payments in v1. Every order is quoted during the appointment.
- 2026-10-03: Booking engine is custom (not Cal.com embed) to keep the brand look and attach the custom-order brief to each booking.
- 2026-10-03: Supabase region Sydney (ap-southeast-2) for latency and data residency.
- 2026-10-03: Wishlist stored in the browser (no customer accounts in v1).
- 2026-10-04: Hosting moved from Vercel to Netlify. Vercel's free Hobby plan can't deploy private organisation repos and is limited to non-commercial use; Netlify's free plan allows both. Analytics: Umami instead of Vercel Analytics.
- 2026-10-04: Supabase free plan pauses inactive projects; add a scheduled keep-alive ping before launch, or the client moves to a paid plan.
- 2026-10-04: Next.js 16 (16.3.8) instead of 15: `create-next-app` installs 16, 15 is in maintenance, and 16 is what Netlify's current runtime targets. Consequences: `src/proxy.ts` instead of `middleware.ts`, Turbopack, async-only request APIs, ESLint run directly. CLAUDE.md updated.
- 2026-10-04: shadcn/ui v4 with the default `base-nova` style (Base UI primitives, not Radix). Forms use the `Field*` components with React Hook Form; v4 has no `Form` wrapper.
- 2026-10-04: Zod validation messages are i18n keys, so one schema serves client and server and every error is translatable. The client renders `t(error.message)` via `FieldMessage`.
- 2026-10-04: i18n is a flat-key JSON dictionary with a cookie-persisted locale and per-key Bengali → English fallback. No i18n routing (`/bn/...`) because the content is the same page in two languages and SEO targets English.
- 2026-10-04: Admin identity is "signed in with Supabase and email equals OWNER_EMAIL (case-insensitive)". No users table until OD-05 (helper roles) is wanted. Checked in proxy.ts, in every admin layout/page, and in every admin action.
- 2026-10-04: Row Level Security enabled on every table with no policies. The app reaches Postgres through Drizzle as the table owner; the anon key can only do Auth. Supabase's REST API is intentionally unusable for data.
- 2026-10-04: Overlapping bookings are prevented by a Postgres EXCLUDE constraint on `tstzrange(starts_at, ends_at)` for non-cancelled rows, written in a custom migration because Drizzle has no EXCLUDE builder. `drizzle-kit generate` diffs against its own snapshot, so it will not try to drop it; never use `drizzle-kit push`.
- 2026-10-04: Storage buckets: `product-images`, `site-images`, `gallery-images` (public), `gallery-pending`, `booking-uploads` (private). Customer gallery photos land in `gallery-pending` and are copied to `gallery-images` on approval.
- 2026-10-04: Bengali content is stored in sibling `_bn` columns rather than a translations table. Simpler queries and search; the owner edits both in one form (OD-36).
- 2026-10-04: Site-wide content (OD-30, OD-33, OD-35) is a `site_settings` key/jsonb table with one Zod schema per key, so adding a content block needs no migration.
- 2026-10-04: Seeded categories (Mugs, Apparel, Home decor, Keyrings, Cushions, Stationery, Gift packs) and occasions (Birthday, Anniversary, Wedding, Eid, Corporate, Baby, Graduation) are provisional until the client meeting (SRS §9). The seed is idempotent and never overwrites edits.
- 2026-10-04: `DIRECT_DATABASE_URL` (Supabase session pooler, port 5432) is used only by drizzle-kit; the app uses the transaction pooler in `DATABASE_URL` with `prepare: false`.
- 2026-10-04: Turnstile is on the admin login form too, because it is a public form (PW-38). Cloudflare's always-pass test keys are used locally and in e2e.
- 2026-10-04: Node 24 pinned in `.nvmrc` (current LTS, matches the dev machines and Netlify).
