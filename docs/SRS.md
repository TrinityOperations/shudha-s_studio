# Shudha's Studio — Software Requirements Specification

Version 0.2 (draft) · 4 Oct 2026 · Owner: Sayek
Status: built from the public Facebook page and team decisions. Sections marked "to confirm" change after the client meeting.

Priority: **M** must have · **S** should have · **C** could have

## 1. Introduction

**Purpose.** Defines the requirements for a website for Shudha's Studio, a Melbourne-based personalised gift maker. Working baseline for the team (Sayek, Shajib, Zawad), to be finalised with the client.

**Scope.** One public website plus a private owner dashboard. The site showcases custom-made products without prices and turns visitors into booked appointments. The owner manages everything herself after handover.

**Business background.** One-person studio (started around late 2024), ~3.2K Facebook followers, Instagram `shudhas.studio`. Products: personalised mugs, apparel, home decor, keyrings, cushions, occasion stationery and gift packs, often with Bengali text, Bengali cultural themes and Islamic calligraphy. Customer base is largely the Bangladeshi community in Melbourne. Orders currently taken by Messenger.

**Stakeholders.**

| Stakeholder | Role |
| --- | --- |
| Business owner (Shudha) | Client, sole dashboard user, approves design and content |
| Customers | Browse products, book appointments |
| Sayek | Project lead, development, planning, client liaison |
| Shajib, Zawad | Development |

**Out of scope (v1).** Online payments, cart/checkout, shipping, multi-vendor, customer accounts.

## 2. Overall description

**Product perspective.** Standalone web app: a public, content-driven storefront (no checkout) and a secured admin area. Portfolio + enquiry funnel, not e-commerce.

**User classes.**

| User | Needs | Technical comfort |
| --- | --- | --- |
| Visitor / customer | Find product ideas quickly, see examples, book a time to discuss a custom order | Mostly mobile, mixed |
| Owner | Add/edit/remove products and images, manage bookings, update site text, no developer help | Low to medium |
| Developer (team) | Deploy, maintain, extend | High |

**Assumptions.**
- Most traffic comes from Facebook/Instagram links; mobile-first is essential.
- The owner uploads her own phone photos; the system must handle large images gracefully.
- No prices anywhere on the public site; every order is quoted after a consultation.
- Hosting and domain costs stay near zero.

**Constraints.**
- Small team; the stack must be fast to build and easy to maintain.
- Full handover: the owner should never need the team for day-to-day changes.
- English primary; Bengali must render correctly (fonts, conjuncts).

## 3. Public website — functional requirements

### 3.1 Home page

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-01 | Hero with studio name, tagline ("Be a reason for someone's happiness & more") and a Book an Appointment call to action | M |
| PW-02 | Featured / latest products grid, curated by the owner | M |
| PW-03 | Shop-by-occasion shortcuts (Birthday, Anniversary, Wedding, Eid, Corporate, Baby, Graduation — to confirm) | M |
| PW-04 | Shop-by-category shortcuts (Mugs, Apparel, Home decor, Keyrings, Cushions, Stationery, Gift packs — to confirm) | M |
| PW-05 | About the maker section with photo and short story | M |
| PW-06 | Customer testimonials carousel | S |
| PW-07 | Instagram / Facebook links or feed | S |
| PW-08 | Scroll-driven animations and smooth page transitions, respecting reduced-motion | S |

### 3.2 Product catalogue

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-10 | Browse all products in a responsive masonry/grid gallery | M |
| PW-11 | Filter by category, occasion and tag; filters combine | M |
| PW-12 | Keyword search (English and Bengali text) | M |
| PW-13 | Sort by newest / featured | S |
| PW-14 | No prices shown anywhere on public pages | M |
| PW-15 | Paginated or infinite loading with lazy images | S |

### 3.3 Product detail page

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-20 | Image gallery with zoom and swipe on mobile | M |
| PW-21 | Title, description, category, occasion tags, material/size notes | M |
| PW-22 | Personalisation options shown as text (name, date, photo, language, etc.) | M |
| PW-23 | Typical turnaround time | S |
| PW-24 | Book an appointment button that pre-fills this product as the enquiry subject | M |
| PW-25 | Related products | S |
| PW-26 | Share buttons (WhatsApp, Facebook, copy link) | S |

### 3.4 Appointment booking

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-30 | Booking form: name, phone, email, preferred date/time, product of interest, message, reference image upload | M |
| PW-31 | Calendar shows only the owner's available slots; past and blocked times hidden | M |
| PW-32 | Prevents double-booking (server-side conflict check in a transaction) | M |
| PW-33 | Choice of consultation type: in person, phone, video call (to confirm) | S |
| PW-34 | Confirmation screen + confirmation email to customer | M |
| PW-35 | Notification to owner (email; optionally push/SMS/WhatsApp) | M |
| PW-36 | Reminder to customer before the appointment | S |
| PW-37 | Customer can reschedule/cancel via a secure link in the email | S |
| PW-38 | Spam protection (Turnstile, rate limiting) | M |

### 3.5 Custom order wizard (confirmed for v1)

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-50 | Multi-step wizard: product type → occasion → details (names, dates, message, language) → photo upload → quantity and needed-by date → book a slot | M |
| PW-51 | Wizard can start from a product page with the product pre-selected | M |
| PW-52 | Result is a structured brief attached to the booking, visible in the dashboard | M |
| PW-53 | Progress is kept if the customer navigates between steps; abandoned wizards are not stored | S |

### 3.6 Wishlist / mood board (confirmed for v1)

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-60 | Customer can save products to a list without an account (stored in the browser) | M |
| PW-61 | Saved list can be attached to one booking in a single step | M |
| PW-62 | Shareable link to the list (e.g. for a wedding planner) | C |

### 3.7 Customer gallery (confirmed for v1)

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-70 | "Happy customers" page with photos submitted by customers | M |
| PW-71 | Submission form: photo, first name (optional), short note, consent checkbox | M |
| PW-72 | Nothing appears publicly until the owner approves it in the dashboard | M |

### 3.8 Other public pages

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-40 | About page | M |
| PW-41 | How it works page (browse → book → consult → create → collect/deliver) | M |
| PW-42 | Contact page with form, social links, area served | M |
| PW-43 | FAQ page | S |
| PW-44 | Gallery / lookbook separate from the catalogue | C |
| PW-45 | Privacy policy and terms pages | M |
| PW-46 | Branded 404 page | S |

### 3.9 Language (confirmed for v1)

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-80 | English / Bengali toggle, persisted for the visitor | M |
| PW-81 | All UI strings translated; product content translated where the owner provides it, otherwise falls back to English | M |
| PW-82 | Bengali rendered with a proper font (Noto Sans Bengali or similar) | M |

### 3.10 Seasonal theming (confirmed for v1)

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-90 | A small set of themes (default, Eid, Christmas, Valentine's, Mother's Day — to confirm) changing colours, hero imagery and accents | M |
| PW-91 | Theme is chosen by the owner from the dashboard; one click, no deploy | M |

## 4. Owner dashboard — functional requirements

Private, at `/admin`, for one non-technical user on a phone or laptop.

### 4.1 Authentication and security

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-01 | Email + password login; magic link as an alternative | M |
| OD-02 | Optional two-factor authentication | S |
| OD-03 | Forgot-password flow | M |
| OD-04 | Session timeout and logout | M |
| OD-05 | Role support (owner, helper with limited rights) | C |

### 4.2 Product management

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

### 4.3 Appointment management

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-20 | Calendar and list view of bookings (upcoming, past, cancelled) | M |
| OD-21 | Set weekly availability, slot length, buffer time, blocked dates/holidays | M |
| OD-22 | Confirm, reschedule, cancel bookings; customer gets an email | M |
| OD-23 | Booking status (New, Confirmed, Done, Cancelled) and private notes | M |
| OD-24 | One-tap reply to the customer by WhatsApp/email from the booking | S |
| OD-25 | Google Calendar sync | S |
| OD-26 | View the custom-order brief and attached wishlist on each booking | M |

### 4.4 Content and settings

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-30 | Edit hero text, about text, FAQ, contact details, social links | M |
| OD-31 | Manage testimonials (add, hide, reorder) | S |
| OD-32 | Approve, hide or delete customer gallery submissions | M |
| OD-33 | Site-wide announcement banner toggle | S |
| OD-34 | Change own password and email | M |
| OD-35 | Choose the active seasonal theme | M |
| OD-36 | Edit Bengali translations of product content | M |

### 4.5 Insights

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-40 | Overview: bookings this week, most viewed products, enquiries by category | S |
| OD-41 | Export bookings to CSV | C |

### 4.6 Progressive Web App (confirmed for v1)

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-60 | Dashboard installable on the owner's phone (manifest, icons, offline shell) | M |
| OD-61 | Push notification on new booking and new gallery submission | M |

### 4.7 Handover

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-50 | Plain-language help text inside the dashboard | M |
| OD-51 | Short owner's guide and a walkthrough session | M |

## 5. Deferred features (not in v1)

3D live mug/t-shirt preview · occasion reminders · gift quiz · bulk/corporate enquiry form · order status tracker · deposit payments · AI caption helper · Instagram auto-import · consultation vouchers. Keep the data model open to these where cheap.

## 6. Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NF-01 | Performance | Lighthouse performance ≥ 90 on mobile; LCP under 2.5 s on 4G; WebP/AVIF responsive images |
| NF-02 | Responsiveness | Usable from 360 px phones to 4K; touch-friendly gallery and calendar |
| NF-03 | Accessibility | WCAG 2.2 AA; keyboard navigation; alt text prompted on upload; reduced-motion support |
| NF-04 | SEO | Server-rendered pages, per-product meta and Open Graph images, sitemap, LocalBusiness + Product structured data |
| NF-05 | Security | HTTPS only, hashed passwords, CSRF/XSS protection, rate-limited forms, signed uploads, server-protected admin routes, dependency scanning |
| NF-06 | Privacy | Data stored in Sydney region; privacy policy; deletion on request |
| NF-07 | Reliability | 99.9% uptime via managed hosting; daily DB backups |
| NF-08 | Maintainability | TypeScript end to end, lint, tests, CI on push, README and runbook |
| NF-09 | Cost | Under AUD 10/month at launch |
| NF-10 | Localisation | Correct Bengali rendering; Australian date format; Melbourne time zone |
| NF-11 | Browser support | Latest two versions of major browsers plus in-app Facebook/Instagram browsers |
| NF-12 | Analytics | Privacy-friendly analytics visible in the dashboard |

## 7. Tech stack

Next.js 15 + TypeScript on Netlify · Tailwind v4 + shadcn/ui · Framer Motion · Supabase (Postgres, Auth, Storage, Sydney) · Drizzle ORM · React Hook Form + Zod · Resend + React Email · Cloudflare Turnstile · Vitest + Playwright · pnpm.

## 8. Architecture

Customer and owner both use one Next.js deployment. Admin routes are protected server-side by Supabase Auth. All data and images live in Supabase. The app talks to Resend, Google Calendar and Turnstile only from the server.

## 9. Open questions (client meeting)

- Consultation types and location
- Working hours, slot length, booking horizon
- Delivery / pickup / postage
- Final product list, categories, occasions, personalisation options per product
- Logo, colours, fonts, reference sites
- Bengali: full site or main pages; who writes it
- Testimonials and customer photos permission
- Domain name and business email
- Launch date
