# Shudha's Studio

Website and owner dashboard for **Shudha's Studio**, a Melbourne personalised-gift maker. Customers browse custom products (with optional "From $X" starting prices) and book an appointment to discuss an order. There is no cart or checkout: the final price is agreed in the appointment. The owner manages everything from a private dashboard at `/admin`.

- Requirements: [`docs/SRS.md`](docs/SRS.md) (v1.0)
- How the team works: [`docs/WORKFLOW.md`](docs/WORKFLOW.md) and one card per slice in [`docs/slices/`](docs/slices/README.md)
- Visual design: [`docs/design.md`](docs/design.md)
- Decisions log: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Work plan: GitHub Issues #1–#16, in build order

---

## Current state (11 October 2026)

**10 of 16 slices are built and merged.** The public site has its final look, a working catalogue, booking, custom orders, a wishlist and its content pages. The owner can manage products, availability, bookings, site content and the home page photos from the dashboard. Nothing is online yet: hosting is set up but not connected, and the domain is bought at launch.

| # | Slice | Status |
| --- | --- | --- |
| 1 | Foundation: schema, security, owner login, English/Bengali switch | Done |
| 2 | Product management in the dashboard | Done |
| 3 | Public catalogue and product page | Done |
| 4 | Availability settings and booking engine | Done |
| 5 | Booking emails, manage link and reminders | Done |
| 6 | Booking management in the dashboard | Done |
| 7 | Custom order wizard | Done |
| 8 | Wishlist | Done |
| 9 | Home page and visual design | Done |
| 10 | Content pages, site settings and home page editor | Done |
| 11 | English / Bengali completion | Next (needs the client) |
| 12 | Customer gallery (happy customers) | Not started |
| 13 | Seasonal theming | Not started |
| 14 | PWA dashboard, push notifications and dashboard design pass | Not started |
| 15 | Performance, accessibility and SEO pass | Not started |
| 16 | Owner's guide, training and launch | Not started |

**Known gaps until later slices land**
- The "Happy customers" footer link (`/gallery`) shows "not found" until #12.
- The seasonal banner uses the everyday colour until #13 adds seasonal themes.
- Some Bengali text still needs the owner's review (#11).
- The dashboard uses the site's colours and fonts but hasn't had its own design pass (#14).

**Placeholders until the client sends them:** logo (text wordmark for now), her portrait and story, WhatsApp number (the chat button stays hidden until one is set), and real opening hours (seeded as Mon–Sat 10:00–18:00). She can fill in all of these herself from the dashboard.

---

## What works today

**Public site**

| Page | What it does |
| --- | --- |
| `/` | Home page: hero video with welcome card, shop by occasion, signature designs, new from the studio with category chips, custom order section, kind words, meet Shudha, follow the studio. Sections with nothing in them are hidden |
| `/products` | Catalogue with category, occasion and search filters (English and Bengali), paging |
| `/products/[slug]` | Product page: photo gallery, "From $X" when set, delivery note, share and WhatsApp links, related products, add to wishlist |
| `/book` | Book a consultation: pick a type, date and free time slot, attach a reference photo and wishlist items |
| `/custom-order` | Seven-step custom order wizard (personal or business order, up to three photos), ends in a booking |
| `/wishlist` | Saved products (kept in the browser, no account needed), shareable link, attach to a booking |
| `/booking/manage/[token]` | Customer's own link from the email to cancel or reschedule |
| `/about` | Her story |
| `/how-it-works` | How ordering works, with a delivery and pickup section (`/delivery` redirects here) |
| `/faq` | Questions and answers |
| `/contact` | Contact form; the message is saved and emailed to the owner |
| `/privacy`, `/terms` | Legal pages, edited by the owner |

**Owner dashboard** (`/admin`, owner only)

| Page | What it does |
| --- | --- |
| `/admin` | Next bookings at a glance, and the "Edit home page" button |
| `/admin/home-editor` | The real home page with an editing bar: change any photo or the hero video, pick products for the signature and new sections, then Save, Discard or Exit. Nothing goes live until Save |
| `/admin/products` | Add, edit, reorder photos, publish, archive, preview; categories, occasions and tags under Taxonomy |
| `/admin/availability` | Weekly hours, blocked dates, slot length, notice and booking horizon |
| `/admin/bookings` | Upcoming, past and cancelled bookings, calendar view, search; confirm, reschedule, cancel, mark done, private notes, one-tap WhatsApp reply |
| `/admin/settings` | General (studio name, tagline), Content (her story, delivery note, contact email and WhatsApp number, social links, privacy and terms), Announcement, Seasonal banner, FAQs, Testimonials, Account (password change) |

**Behind the scenes**
- Emails for every booking step (customer and owner), with calendar (`.ics`) attachments, in English or Bengali.
- Reminder emails about 24 hours before each appointment, sent by an hourly Netlify function.
- Double bookings are blocked by the server and by a database rule.
- Every public form is protected by Cloudflare Turnstile and a rate limit.

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

### 3. Create your own Supabase dev project
Each developer works against their **own free Supabase project**, never the team's shared one. Create one at [supabase.com](https://supabase.com) (region: Sydney). Only the lead applies migrations to the shared project.

### 4. Add your environment file
Copy the template:
```
cp .env.example .env.local        # macOS / Linux
copy .env.example .env.local      # Windows (Command Prompt)
```
Fill in `.env.local` from **your dev project**. Copy and paste keys; don't retype them.

| Key | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → Secret key, from the **same** project (**private**) |
| `DATABASE_URL` | Supabase → Connect → Transaction pooler, port 6543 (**private**) |
| `DIRECT_DATABASE_URL` | Session pooler, port 5432. Used only for migrations (**private**) |
| `DB_POOL_MAX` | Optional. Max database connections per process (default 10) |
| `RESEND_API_KEY` | resend.com → API Keys (**private**). Anything not starting with `re_` means emails are only logged |
| `EMAIL_FROM` | Optional. Leave empty to use Resend's test sender until the studio domain exists |
| `EMAIL_DRY_RUN` | Optional. `1` logs emails instead of sending them |
| `CRON_SECRET` | Optional. Protects the reminder job. **At least 16 characters**, or the app won't start. Make one with `openssl rand -hex 32` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Keep Cloudflare's always-pass test keys from `.env.example` for local work and e2e |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `OWNER_EMAIL` | The one email allowed into `/admin` |
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` | Optional. The owner login used by browser tests; keep it the same account as `OWNER_EMAIL` |

`.env.local` is gitignored. Never commit it, paste it in chat, or screenshot it.

While Resend has no verified domain, it only delivers to the email address that owns the Resend account.

### 5. Install dependencies
```
pnpm install
```

### 6. Set up the database
```
pnpm db:migrate
pnpm db:seed
```
Both are safe to re-run. The seed adds starting settings, opening hours (Mon–Sat 10:00–18:00), 10 categories, 9 occasions, the `signature` tag and a starter FAQ, with Bengali names. The owner can change all of them in the dashboard.

### 7. Create the owner account
Supabase → Authentication → Users → Add user → Create new user, using the `OWNER_EMAIL` address, a strong password and **Auto Confirm User** ticked. Then turn off **Allow new users to sign up** under Authentication → Sign In / Providers.

### 8. Start the site
```
pnpm dev
```
Open **http://localhost:3000**. The first page load takes 10–20 seconds while it compiles. Stop the server with **Ctrl+C**.

### 9. Optional: load demo content
An empty database shows a mostly empty home page. To see the site as the client will, load the demo pack (18 products with photos, home page photos, a hero video, sample quotes and gallery tiles):
```
pnpm demo:seed
pnpm demo:clear      # removes exactly what demo:seed added
```
Only use these on a development database. `demo:clear` needs the `scripts/demo-content/manifest.json` file that `demo:seed` writes on the same computer, and it deletes the home, announcement and seasonal banner settings rather than restoring earlier values.

---

## What you can test right now

| # | Do this | Expected |
| --- | --- | --- |
| 1 | Open `localhost:3000` | Home page; the header shrinks to the logo mark as you scroll past the hero |
| 2 | Click "বাংলা" in the header | Page switches to Bengali; untranslated text falls back to English |
| 3 | Open `/products`, filter by a category, search a word | Matching products only; the filters stay in the address bar |
| 4 | Tap the heart on a product, then open `/wishlist` | The product is saved; "Share" gives a link that opens the same list |
| 5 | Open `/book`, pick a date and time, submit | Confirmation page; the slot disappears for the next person; emails sent (or logged in dry run) |
| 6 | Open `/custom-order` and go through the steps | Browser Back moves between steps; the last step creates a booking |
| 7 | Send a message from `/contact` | Thank-you message; the owner gets an email (or it's logged in dry run) |
| 8 | Go to `/admin` while signed out | Redirected to the login page |
| 9 | Sign in as the owner | Dashboard with the next bookings |
| 10 | `/admin/products` → add a product with a photo → publish | It appears on `/products` |
| 11 | `/admin/bookings` → open the new booking → confirm | Status changes; the customer gets a confirmation email |
| 12 | `/admin/availability` → block tomorrow | No slots for tomorrow on `/book` |
| 13 | Dashboard → "Edit home page" → change a photo → Save | The new photo shows on the home page; Discard instead leaves it unchanged |
| 14 | Settings → Content → add a WhatsApp number | The WhatsApp chat button appears on public pages |

Automated checks:
```
pnpm lint && pnpm typecheck && pnpm test     # must pass before every pull request
pnpm format:check                             # also checked in CI
pnpm exec playwright install chromium         # once per computer
pnpm e2e                                      # browser tests; owner tests need E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD
```
Database race tests (bookings and reminders) run only against a real database you don't mind being written to:
```
RUN_DB_TESTS=1 pnpm vitest run src/lib/booking/concurrency.db.test.ts src/lib/booking/reminders.db.test.ts
```
Green tests don't prove a page looks right. After any layout change, open the page and look at it.

---

## Everyday commands
```
pnpm dev             # local dev server
pnpm build           # production build
pnpm lint            # code style checks
pnpm typecheck       # TypeScript checks
pnpm test            # unit tests (Vitest)
pnpm e2e             # browser tests (Playwright)
pnpm format          # auto-format with Prettier
pnpm format:check    # check formatting without changing files
pnpm db:generate     # create a migration after editing src/db/schema.ts
pnpm db:migrate      # apply migrations
pnpm db:seed         # seed starting data
pnpm db:studio       # browse the database in your browser
pnpm demo:seed       # load demo content (dev database only)
pnpm demo:clear      # remove demo content
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Login always says "wrong email or password" | Re-copy the Supabase publishable key into `.env.local` (don't retype), then restart `pnpm dev`. Check the user is confirmed in Supabase → Users and matches `OWNER_EMAIL`. Check the terminal running `pnpm dev` for the real error |
| App won't start, error mentions `CRON_SECRET` | It must be at least 16 characters, or left empty |
| Uploads fail with "Invalid API key" | `SUPABASE_SERVICE_ROLE_KEY` is from a different Supabase project |
| Hero video upload is refused | Run `pnpm db:migrate`; migration 0004 lets the `site-images` bucket accept mp4 files up to 10 MB |
| Booking or contact emails don't arrive | Resend's test sender only delivers to the Resend account owner's email. Check the terminal for dry-run logs |
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
  app/(public)/          public pages (home, products, book, custom-order, wishlist, content pages)
  app/admin/             owner dashboard (login, home editor, protected pages)
  app/api/cron/          reminder job endpoint
  proxy.ts               session refresh and /admin protection (Next 16's replacement for middleware)
  actions/               server actions (all writes go here)
  db/schema.ts           database schema (single source of truth)
  db/queries/            read functions, one file per entity
  db/seed.ts             starting data
  emails/                email templates (English and Bengali)
  lib/booking/           slot generation, conflict checks, reminders
  lib/                   auth, i18n (en.json / bn.json), validators, Supabase clients, WhatsApp links, helpers
  components/            ui (shadcn), public (home, layout, pages, catalogue, ...), admin, shared
drizzle/                 SQL migrations
e2e/                     Playwright tests
netlify/functions/       scheduled reminder function
public/fonts/            Bengali accent font subset
scripts/demo-content/    demo products, photos and hero video for showcases
certs/                   Supabase CA certificate (database TLS is verified)
docs/                    SRS, workflow, slice cards, design and decisions log
```

## Team workflow
Full rules in [`docs/WORKFLOW.md`](docs/WORKFLOW.md). In short:
- One slice = one issue = one branch = one pull request. Branch as `feat/<issue>-<name>` from the latest `main`; never commit to `main`.
- Stay inside your slice's files (listed in its card).
- Pull request title `feat: <slice name> (#N)` with `Closes #N` in the description, then **Squash and merge**.
- Reference requirement IDs (PW-xx, OD-xx, NF-xx) in commit messages.
- Record any non-obvious technical choice in `docs/DECISIONS.md` in the same pull request.
- CI on GitHub runs lint, typecheck, unit tests and the format check on every push. Netlify (once connected) deploys `main` to production and each pull request to a preview link.
