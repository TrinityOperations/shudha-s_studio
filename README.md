# Shudha's Studio

Website and owner dashboard for **Shudha's Studio**, a Melbourne personalised-gift maker. Customers browse custom products (with optional starting prices) and book an appointment to discuss an order. The owner manages everything from a private dashboard at `/admin`.

- Requirements: [`docs/SRS.md`](docs/SRS.md)
- Decisions log: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Work plan: GitHub Issues #1–#16, in build order

---

## Current state (October 2026)

**Stage: Foundation (issue #1) built.** The project runs locally. There are no customer-facing features yet. Nothing is online yet.

| Area | Status |
| --- | --- |
| Project setup (Next.js 16, pnpm, Tailwind v4, shadcn v4) | Done |
| Database schema for every SRS entity (18 tables), migrations, seed data | Done, applied to the shared Supabase project |
| Security: Row Level Security on all tables, storage buckets, no-overlap rule for bookings | Done |
| Owner login, `/admin` protected, only `OWNER_EMAIL` can get in | Done |
| English / Bengali language switch | Done |
| Home page showing studio name and tagline | Done (placeholder design) |
| Dashboard settings page (edit studio name and tagline) | Done |
| Products, catalogue, booking, emails, wizard, wishlist, gallery, themes, PWA | Not started (issues #2–#14) |
| Visual design | Not started (issue #9) |
| Hosting on Netlify | Configured (`netlify.toml`), not connected yet |

Seeded starting data: 7 categories (Mugs, Apparel, Home decor, Keyrings, Cushions, Stationery, Gift packs) and 7 occasions (Birthday, Anniversary, Wedding, Eid, Corporate, Baby, Graduation), with Bengali names. These are **provisional** until the client confirms them.

---

## Run it on any computer

Works on macOS, Windows and Linux. Takes about 15 minutes the first time.

### 1. Install the tools (once per computer)

| Tool | Version | How to install |
| --- | --- | --- |
| Git | any recent | macOS: `xcode-select --install` · Windows: [git-scm.com](https://git-scm.com) · Linux: your package manager |
| Node.js | 24 (see `.nvmrc`) | [nodejs.org](https://nodejs.org) LTS installer, or `nvm install 24` (macOS/Linux) / `nvm-windows` |
| pnpm | 12 | Comes with Node: run `corepack enable` (macOS/Linux may need `sudo`; Windows: run the terminal as Administrator) |

Check:
```
git --version
node -v      # v24.x
pnpm -v      # 12.x
```

### 2. Get the code
```
git clone https://github.com/TrinityOperations/shudhas_studio.git
cd shudhas_studio
```
Avoid folder names with apostrophes or spaces; they break some tools.

> Until issue #1 is merged, the foundation code lives on the `feat/1-foundation` branch. Run `git switch feat/1-foundation`. After the merge, stay on `main`.

### 3. Add your environment file
Copy the template:
```
cp .env.example .env.local        # macOS / Linux
copy .env.example .env.local      # Windows (Command Prompt)
```
Fill in every value in `.env.local`. Get the real keys from Sayek through the shared password vault, never through chat or email. Copy and paste them; don't retype them.

| Key | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → Secret key (**private**) |
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (port 6543) (**private**) |
| `DIRECT_DATABASE_URL` | Same string, port 5432 (session pooler). Used only for migrations (**private**) |
| `RESEND_API_KEY` | resend.com → API Keys (**private**) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile (secret is **private**). For local work you can use Cloudflare's always-pass test keys listed in `.env.example` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `OWNER_EMAIL` | The one email allowed into `/admin` |

`.env.local` is gitignored. Never commit it, paste it in chat, or screenshot it.

### 4. Install dependencies
```
pnpm install
```

### 5. Database (only if needed)
The team shares one Supabase project, and it is already migrated and seeded. Only run these if you're told the schema changed, or you're setting up a brand-new Supabase project:
```
pnpm db:migrate
pnpm db:seed
```
Both are safe to re-run.

### 6. Owner account (once per Supabase project)
Already done for the shared project. For a new project: Supabase → Authentication → Users → Add user → Create new user, using the `OWNER_EMAIL` address, a strong password and **Auto Confirm User** ticked. Then turn off **Allow new users to sign up** under Authentication → Sign In / Providers.

### 7. Start the site
```
pnpm dev
```
Open **http://localhost:3000**. The first page load takes 10–20 seconds while it compiles. Stop the server with **Ctrl+C**.

---

## What you can test right now

| # | Do this | Expected |
| --- | --- | --- |
| 1 | Open `localhost:3000` | Studio name and tagline |
| 2 | Click the language switch (top right) | Page switches to Bengali; untranslated text falls back to English |
| 3 | Go to `localhost:3000/admin` | Redirected to the login page |
| 4 | Submit the login form empty | Inline error messages |
| 5 | Sign in with a wrong password | Error, still logged out |
| 6 | Sign in as the owner | Dashboard opens |
| 7 | `/admin/settings` → change the tagline → save | "Saved" message; new tagline on the home page |
| 8 | Sign out, then open `/admin/settings` | Redirected to login |

Automated checks:
```
pnpm lint && pnpm typecheck && pnpm test     # must pass before every pull request
pnpm exec playwright install chromium         # once per computer
pnpm e2e                                      # browser tests; login test needs E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD in .env.local
```

---

## Everyday commands
```
pnpm dev             # local dev server
pnpm lint            # code style checks
pnpm typecheck       # TypeScript checks
pnpm test            # unit tests (Vitest)
pnpm e2e             # browser tests (Playwright)
pnpm format          # auto-format with Prettier
pnpm db:generate     # create a migration after editing src/db/schema.ts
pnpm db:migrate      # apply migrations
pnpm db:seed         # seed starting data
pnpm db:studio       # browse the database in your browser
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Login always says "wrong email or password" | Re-copy the Supabase publishable key and Turnstile secret into `.env.local` (don't retype), then restart `pnpm dev`. Check the user is confirmed in Supabase → Users. Check the Terminal running `pnpm dev` for the real error |
| Changes to `.env.local` don't take effect | Restart `pnpm dev`; it only reads the file at startup |
| First page is very slow | Normal on the first load; Turbopack is compiling |
| `Port 3000 is in use` | Another `pnpm dev` is running. Stop it, or use `pnpm dev -p 3001` |
| `pnpm: command not found` | Run `corepack enable`, then open a new terminal |
| Site stopped working after a quiet week | Supabase's free plan pauses inactive projects. Restore it from the Supabase dashboard |
| Git says another process is running | Delete the stale lock: `rm .git/index.lock` |

---

## Project structure
```
src/
  app/(public)/        public pages
  app/admin/           owner dashboard (login + protected pages)
  proxy.ts             session refresh and /admin protection (Next 16's replacement for middleware)
  actions/             server actions (all writes go here)
  db/schema.ts         database schema (single source of truth)
  db/queries/          read functions
  db/seed.ts           starting data
  lib/                 auth, i18n (en.json / bn.json), validators, Supabase clients, helpers
  components/          ui (shadcn), public, admin, shared
drizzle/               SQL migrations
e2e/                   Playwright tests
docs/                  SRS and decisions log
```

## Team workflow
- Never commit to `main` directly. Branch as `feat/<issue>-<name>` or `fix/<name>`, push, open a pull request, and get one review.
- Reference the issue and requirement IDs in commit messages (e.g. `Closes #2`, `OD-10`).
- Record any non-obvious technical choice in `docs/DECISIONS.md` in the same pull request.
- Netlify (once connected) deploys `main` to production and each pull request to a preview link. CI on GitHub runs lint, typecheck, unit tests and the format check on every push.
