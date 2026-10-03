# Shudha's Studio — project guide for Claude Code

Read this file first in every session. Then read `docs/SRS.md` for requirements and `docs/DECISIONS.md` for choices already made. Follow existing patterns in the codebase before inventing new ones.

## What this is
A website for Shudha's Studio, a Melbourne personalised-gift maker. Two parts in one Next.js app:
- Public site: browse custom products (no prices, no checkout), book an appointment to discuss an order.
- Owner dashboard at `/admin`: one non-technical owner manages products, bookings and site content herself.

Requirement IDs (PW-xx, OD-xx, NF-xx) are defined in `docs/SRS.md`. Reference them in commit messages and PR titles.

## Stack (do not swap without updating DECISIONS.md)
- Next.js 15, App Router, React Server Components, TypeScript strict
- Tailwind CSS v4 + shadcn/ui (components live in `src/components/ui`, generated, don't hand-edit)
- Framer Motion for animation, `prefers-reduced-motion` always respected
- Supabase: Postgres, Auth, Storage. Region: Sydney
- Drizzle ORM for schema and queries (`src/db/schema.ts`, migrations in `drizzle/`)
- React Hook Form + Zod; every Zod schema lives in `src/lib/validators/` and is shared by client and server
- Resend + React Email for transactional email (`src/emails/`)
- Cloudflare Turnstile on every public form
- Vitest (unit) + Playwright (e2e, in `e2e/`)
- pnpm. Hosted on Netlify (free plan): `main` deploys to production, every PR gets a preview URL
- Analytics: Umami (privacy-friendly), not Vercel Analytics

## Folder layout
```
src/
  app/
    (public)/        # public routes: /, /products, /products/[slug], /book, /about, /faq, /contact
    admin/           # owner dashboard, protected by middleware
    api/             # route handlers only when a server action can't do it (webhooks, cron)
  components/
    ui/              # shadcn, generated
    public/          # components used only by the public site
    admin/           # components used only by the dashboard
    shared/          # used by both
  db/
    schema.ts        # Drizzle schema, single source of truth
    index.ts         # client
    queries/         # read functions, one file per entity
  actions/           # server actions, one file per entity, all mutations go here
  lib/
    validators/      # Zod schemas
    auth.ts          # requireOwner() helper
    i18n/            # en.json, bn.json and the t() helper
  emails/            # React Email templates
docs/
  SRS.md
  DECISIONS.md
```

## Rules
1. **Mutations only through server actions** in `src/actions/`. Every action: validate with the Zod schema → `requireOwner()` if it's an admin action → do the work → `revalidatePath`. Never call the DB from a client component.
2. **Reads through `src/db/queries/`**, called from server components. No inline SQL in pages.
3. **Admin protection is server-side.** `middleware.ts` redirects unauthenticated `/admin/*` to `/admin/login`; every admin action also calls `requireOwner()`. Client-side checks are cosmetic only.
4. **No prices anywhere** in the public UI or the data model. Quotes happen in the appointment.
5. **Images**: upload through a server action to Supabase Storage bucket `product-images`, resize to max 1600px and generate a 400px thumbnail on upload, serve with `next/image`. Prompt for alt text on upload.
6. **Forms**: React Hook Form + Zod + shadcn `Form` components. Show field errors inline, a toast on success. Public forms include Turnstile.
7. **i18n**: all user-facing strings go through `t('key')`, keys in `src/lib/i18n/en.json` and `bn.json`. Never hard-code visible text in components, even in admin.
8. **Time zone**: store UTC, display Australia/Melbourne. Use `date-fns-tz`.
9. **Booking engine** lives in `src/lib/booking/`: availability rules → generated slots → conflict check in a single transaction. Never trust a slot from the client; recompute on the server.
10. **Accessibility**: semantic HTML, labelled inputs, focus states, keyboard-reachable dialogs and galleries. Lighthouse a11y ≥ 95.
11. **Tests**: every server action has a Vitest test; booking flow and product CRUD have Playwright tests. Run `pnpm lint && pnpm typecheck && pnpm test` before declaring work done.
12. **Keep DECISIONS.md current.** When you make a non-obvious choice (library, pattern, trade-off), append a dated line.

## Working style for Claude Code sessions
- Start by reading CLAUDE.md, the relevant SRS section, and the existing code for the entity you're touching.
- For anything beyond a small fix, propose a plan (files to create/change, schema changes, open questions) and wait for approval before writing code.
- Build vertical slices: schema → query/action → UI → test, for one requirement group at a time.
- Match existing naming and structure exactly. If the codebase already does something a certain way, do it that way.
- Don't add dependencies without saying why; prefer what's already installed.
- Don't touch `src/components/ui/` by hand; use the shadcn CLI.
- Finish each session with: what was done, what's untested, what the next slice should be.

## Commands
```
pnpm dev            # local dev
pnpm db:generate    # drizzle migration from schema changes
pnpm db:migrate     # apply migrations
pnpm db:studio      # browse data
pnpm lint && pnpm typecheck && pnpm test
pnpm e2e            # playwright
```

## Environment variables (never commit values)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `OWNER_EMAIL`. See `.env.example`.
