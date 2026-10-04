<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Shudha's Studio — project guide for coding agents

Read this file first in every session. Then read `docs/WORKFLOW.md` (how the team works), your slice card in `docs/slices/`, the matching sections of `docs/SRS.md`, and `docs/DECISIONS.md` (choices already made). Follow existing patterns in the codebase before inventing new ones.

## What this is
A website for Shudha's Studio, a Melbourne personalised-gift maker. Two parts in one Next.js app:
- Public site: browse custom products (no prices, no checkout), book an appointment to discuss an order.
- Owner dashboard at `/admin`: one non-technical owner manages products, bookings and site content herself.

Requirement IDs (PW-xx, OD-xx, NF-xx) are defined in `docs/SRS.md`. Reference them in commit messages and PR titles.

## Stack (do not swap without updating DECISIONS.md)
- Next.js 16, App Router, React Server Components, TypeScript strict. Next 16 differs from older training data: `src/proxy.ts` (not `middleware.ts`), Turbopack by default, request APIs (`cookies()`, `params`, `searchParams`) are async only, `next lint` is gone (`pnpm lint` runs ESLint directly), `LayoutProps<"/x">` / `PageProps<"/x">` are generated global types. The bundled docs are in `node_modules/next/dist/docs/`; `AGENTS.md` points there and is managed by `next dev`.
- Tailwind CSS v4 + shadcn/ui v4 (Base UI primitives, style `base-nova`). Components live in `src/components/ui`, generated, don't hand-edit. v4 has no `Form` component: forms use the `Field*` components (`Field`, `FieldLabel`, `FieldError`, `FieldGroup`, `FieldDescription`).
- Framer Motion for animation, `prefers-reduced-motion` always respected (also enforced globally in `globals.css`)
- Supabase: Auth and Storage only. Region: Sydney. Row Level Security is enabled on every table with no policies; all data access is server-side through Drizzle.
- Drizzle ORM for schema and queries (`src/db/schema.ts`, migrations in `drizzle/`). Constraints Drizzle can't express (EXCLUDE, RLS, buckets) live in hand-written migrations created with `drizzle-kit generate --custom`.
- React Hook Form + Zod v4; every Zod schema lives in `src/lib/validators/` and is shared by client and server. Validation messages are i18n keys (`"errors.required"`), rendered with `t()` on the client.
- Resend + React Email for transactional email (`src/emails/`)
- Cloudflare Turnstile on every public form (including `/admin/login`)
- Vitest (unit) + Playwright (e2e, in `e2e/`)
- pnpm. Hosted on Netlify (free plan): `main` deploys to production, every PR gets a preview URL
- Analytics: Umami (privacy-friendly), not Vercel Analytics

## Folder layout
```
src/
  proxy.ts           # Next 16 proxy: refreshes the Supabase session, bounces non-owners off /admin
  app/
    layout.tsx       # root: fonts (Geist + Noto Sans Bengali), locale, I18nProvider, Toaster
    (public)/        # public routes: /, /products, /products/[slug], /book, /about, /faq, /contact
    admin/
      login/         # the only /admin route without requireOwner()
      (dashboard)/   # layout calls requireOwner(); every page under it calls it again
    api/             # route handlers only when a server action can't do it (webhooks, cron)
  components/
    ui/              # shadcn, generated
    public/          # components used only by the public site
    admin/           # components used only by the dashboard
    shared/          # used by both: FieldMessage, TurnstileField, SubmitButton, LocaleToggle
  db/
    schema.ts        # Drizzle schema, single source of truth
    index.ts         # client (node-postgres pool, transaction pooler)
    seed.ts          # idempotent seed, `pnpm db:seed`
    queries/         # read functions, one file per entity
  actions/           # server actions, one file per entity, all mutations go here
  lib/
    validators/      # Zod schemas
    auth.ts          # getOwner() / requireOwner()
    owner.ts         # isOwnerEmail(), pure, shared with proxy.ts
    env.ts           # serverEnv() (validated, lazy); env.public.ts for NEXT_PUBLIC_*
    supabase/        # server.ts and client.ts (@supabase/ssr)
    turnstile.ts     # verifyTurnstile()
    time.ts          # Melbourne time helpers (date-fns-tz)
    action-result.ts # ActionResult<T>, ok(), fail()
    i18n/            # en.json, bn.json (flat keys), getT() for server, useT() for client
  emails/            # React Email templates
docs/
  SRS.md
  DECISIONS.md
```

## Rules
1. **Mutations only through server actions** in `src/actions/`. Every action: validate with the Zod schema → `requireOwner()` if it's an admin action → do the work → `revalidatePath`. Return an `ActionResult` (`src/lib/action-result.ts`); error strings are i18n keys. Never call the DB from a client component. Reference example: `src/actions/settings.ts`.
2. **Reads through `src/db/queries/`**, called from server components. No inline SQL in pages. Reference example: `src/db/queries/settings.ts`.
3. **Admin protection is server-side.** `src/proxy.ts` redirects unauthenticated `/admin/*` to `/admin/login`; the `admin/(dashboard)` layout, **every admin page** and every admin action call `requireOwner()` as their first line. The owner is whoever signs in with `OWNER_EMAIL` (compared case-insensitively). Client-side checks are cosmetic only.
4. **No prices anywhere** in the public UI or the data model. Quotes happen in the appointment.
5. **Images**: upload through a server action to Supabase Storage (`product-images`, `site-images`, `gallery-images`, private `gallery-pending` and `booking-uploads`), resize to max 1600px and generate a 400px thumbnail on upload, serve with `next/image`. Prompt for alt text on upload. Customer gallery photos stay in `gallery-pending` until approved, then are copied to `gallery-images`.
6. **Forms**: React Hook Form + Zod + shadcn `Field` components + `FieldMessage` for errors. Client validates with `zodResolver`, calls the server action with the parsed values, the action re-validates. Show field errors inline, a toast (`sonner`) on success. Public forms include `TurnstileField` and the action calls `verifyTurnstile()`. Reference examples: `src/components/admin/login-form.tsx` (public pattern) and `settings-form.tsx` (admin pattern).
7. **i18n**: all user-facing strings go through `t('key')`, flat keys in `src/lib/i18n/en.json` and `bn.json`. Server: `const t = await getT()`. Client: `const t = useT()`. Bengali falls back to English per key. Never hard-code visible text in components, even in admin.
8. **Time zone**: store UTC, display Australia/Melbourne. Use `src/lib/time.ts` (`date-fns-tz`).
9. **Booking engine** lives in `src/lib/booking/`: availability rules → generated slots → conflict check in a single transaction. Never trust a slot from the client; recompute on the server. The `bookings_no_overlap` EXCLUDE constraint is the last line of defence.
10. **Accessibility**: semantic HTML, labelled inputs, focus states, keyboard-reachable dialogs and galleries. Lighthouse a11y ≥ 95.
11. **Tests**: every server action has a Vitest test (`*.test.ts` next to the file; mock `@/db`, `@/lib/auth`, `next/*` with `vi.hoisted` + `vi.mock`); booking flow and product CRUD have Playwright tests. Run `pnpm lint && pnpm typecheck && pnpm test` before declaring work done.
12. **Keep DECISIONS.md current.** When you make a non-obvious choice (library, pattern, trade-off), append a dated line.

## Working style for agent sessions
- Start by reading this file, your slice card, the relevant SRS sections, and the existing code for the entity you're touching.
- For anything beyond a small fix, propose a plan (files to create/change, schema changes, open questions) and wait for approval before writing code.
- Build vertical slices: schema → query/action → UI → test, for one requirement group at a time.
- Match existing naming and structure exactly. If the codebase already does something a certain way, do it that way.
- Don't add dependencies without saying why; prefer what's already installed.
- Don't touch `src/components/ui/` by hand; use the shadcn CLI.
- Finish each session with: what was done, what's untested, what the next slice should be.

## Commands
```
pnpm dev            # local dev (Turbopack)
pnpm db:generate    # drizzle migration from schema changes
pnpm db:migrate     # apply migrations (uses DIRECT_DATABASE_URL)
pnpm db:seed        # idempotent seed data
pnpm db:studio      # browse data
pnpm lint && pnpm typecheck && pnpm test
pnpm format         # prettier (also checked in CI)
pnpm e2e            # playwright (run `pnpm exec playwright install chromium` once)
```

## Environment variables (never commit values)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (transaction pooler, runtime), `DIRECT_DATABASE_URL` (session pooler, migrations only), `RESEND_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `OWNER_EMAIL`. Optional for e2e: `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`. See `.env.example`.

## Team rules (several people build slices in parallel)
1. **One slice = one branch = one pull request.** Branch name `feat/<issue>-<short-name>` from the latest `main`. Never commit to `main`.
2. **Stay inside your slice's owned paths** (listed in your card in `docs/slices/`). Only touch the shared files listed in the card, and only in the way `docs/WORKFLOW.md` describes (append, keep sorted, small edits).
3. **Never edit another slice's owned paths.** If you need something from another slice that isn't merged yet, stop and tell the human; don't build a copy.
4. **Schema changes are rare and serialised.** The schema already covers every SRS entity. If a slice truly needs a change: edit `src/db/schema.ts`, generate the migration only after rebasing on the latest `main`, and say so in the plan. Never hand-edit files in `drizzle/meta/`.
5. **Your own database only.** Run `pnpm db:migrate` and `pnpm db:seed` only against the developer's personal Supabase dev project in their `.env.local`, never against the team's shared project.
6. **i18n keys** are prefixed with the slice's namespace (shown in the card), added in alphabetical order in both `en.json` and `bn.json`. Never rename or delete keys you didn't add.
7. **New dependencies**: propose them in the plan with a reason. Install with `pnpm add`; never hand-edit `pnpm-lock.yaml`.
8. **New environment variables**: add the name (no value) to `.env.example` with a comment, and list it in the PR description.
9. **Do not run `git commit` or `git push`.** A human does. At the end, list the exact commands: files to `git add` (never `.env.local`), a commit message `<type>: <summary> (#<issue>)` referencing requirement IDs, and the push command.
10. **No attribution of any AI tool** in commit messages, pull request text, code comments or docs: no Co-Authored-By lines, "Generated with" footers or tool names.
