# Shudha's Studio — Software Requirements Specification

Version 1.0 · 7 Oct 2026 · Owner: Sayek
Status: confirmed with the client at the meeting on 5 Oct 2026. What changed from v0.2 is listed in section 10.

Priority: **M** must have · **S** should have · **C** could have

## 1. Introduction

**Purpose.** Defines the requirements for a website for Shudha's Studio, a Melbourne-based personalised gift maker. Working baseline for the team (Sayek, Shajib, Zawad), confirmed with the client.

**Scope.** One public website plus a private owner dashboard. The site showcases custom-made products, each with an optional starting price, and turns visitors into booked appointments. The final price is always quoted in the consultation. The owner manages everything herself after handover.

**Business background.** One-person studio (started around late 2024), ~3.2K Facebook followers, Instagram `shudhas.studio`. Products: chocolate wrappers, nameplates, cards, posters, personalised mugs, apparel, home decor, keyrings, cushions and gift packs, often with Bengali text, Bengali cultural themes and Islamic calligraphy. Signature designs draw on Bangladeshi heritage and handmade craft. Customers are retail buyers across Australia (largely the Bangladeshi community) and corporate clients. The owner prefers WhatsApp for talking to customers; orders currently come through Messenger and WhatsApp. Orders are collected in person or posted Australia-wide, arranged with each customer during the consultation. The business has an ABN.

**Stakeholders.**

| Stakeholder | Role |
| --- | --- |
| Business owner (Shudha) | Client, sole dashboard user, approves design and content |
| Customers | Browse products, book appointments |
| Sayek | Project lead, development, planning, client liaison |
| Shajib, Zawad | Development |

**Out of scope (v1).** Online payments, cart/checkout, delivery options or postage costs, order tracking, automated WhatsApp messages, multi-vendor, customer accounts.

## 2. Overall description

**Product perspective.** Standalone web app: a public, content-driven storefront (no checkout) and a secured admin area. Portfolio + enquiry funnel, not e-commerce.

**User classes.**

| User | Needs | Technical comfort |
| --- | --- | --- |
| Visitor / customer | Find product ideas quickly, see examples and a starting price, book a time to discuss a custom order | Mostly mobile, mixed |
| Owner | Add/edit/remove products and images, manage bookings, reply on WhatsApp, update site text, no developer help | Low to medium |
| Developer (team) | Deploy, maintain, extend | High |

**Assumptions.**
- Most traffic comes from Facebook/Instagram links; mobile-first is essential.
- The owner uploads her own phone photos (almost all photos are of her own work); the system must handle large images gracefully.
- Products may show a starting price ("From $X"). Every order is still quoted after a consultation; there is no cart, checkout or payment.
- WhatsApp is the main way the owner talks to customers.
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
| PW-03 | Shop-by-occasion shortcuts (Birthday, Anniversary, Wedding, Christmas, New Year, Corporate, Eid; the owner manages the list) | M |
| PW-04 | Shop-by-category shortcuts (Chocolate wrappers, Nameplates, Cards, Posters, Mugs, Apparel, Home decor, Keyrings, Cushions, Gift packs; the owner manages the list) | M |
| PW-05 | About the maker section with photo and her story (handmade, Bangladeshi heritage) | M |
| PW-06 | Customer testimonials carousel | S |
| PW-07 | Instagram / Facebook links or feed | S |
| PW-08 | Scroll-driven animations and smooth page transitions, respecting reduced-motion | S |
| PW-09 | Signature designs section: products carrying the owner's "signature" tag | S |

### 3.2 Product catalogue

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-10 | Browse all products in a responsive masonry/grid gallery | M |
| PW-11 | Filter by category, occasion and tag; filters combine | M |
| PW-12 | Keyword search (English and Bengali text) | M |
| PW-13 | Sort by newest / featured | S |
| PW-14 | Optional starting price on product cards and pages, shown as "From $X" (AUD). Nothing is shown when the owner leaves it blank. No cart, checkout or payment anywhere | M |
| PW-15 | Paginated or infinite loading with lazy images | S |

### 3.3 Product detail page

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-20 | Image gallery with zoom and swipe on mobile | M |
| PW-21 | Title, description, starting price if set, category, occasion tags, material/size notes | M |
| PW-22 | Personalisation options shown as text (name, date, photo, language, etc.) | M |
| PW-23 | Typical turnaround time | S |
| PW-24 | Book an appointment button that pre-fills this product as the enquiry subject | M |
| PW-25 | Related products | S |
| PW-26 | Share buttons (WhatsApp, Facebook, copy link) | S |
| PW-27 | Optional product video: a Facebook, Instagram or YouTube link shown on the product page | C |

### 3.4 Appointment booking

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-30 | Booking form: name, WhatsApp number, email, preferred date/time, product of interest, message, reference image upload | M |
| PW-31 | Calendar shows only the owner's available slots; past and blocked times hidden | M |
| PW-32 | Prevents double-booking (server-side conflict check in a transaction) | M |
| PW-33 | Choice of consultation type: in person, phone, video call (to confirm) | S |
| PW-34 | Confirmation screen + confirmation email to customer, both with a WhatsApp link to the studio | M |
| PW-35 | Notification email to the owner with a one-tap WhatsApp link to the customer (push in OD-61) | M |
| PW-36 | Reminder to customer before the appointment | S |
| PW-37 | Customer can reschedule/cancel via a secure link in the email | S |
| PW-38 | Spam protection (Turnstile, rate limiting) | M |

### 3.5 Custom order wizard

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-50 | Multi-step wizard: product type → occasion → personal or business order (business name if business) → details (names, dates, message, language) → photo upload → quantity and needed-by date → book a slot | M |
| PW-51 | Wizard can start from a product page with the product pre-selected | M |
| PW-52 | Result is a structured brief attached to the booking, visible in the dashboard | M |
| PW-53 | Progress is kept if the customer navigates between steps; abandoned wizards are not stored | S |

### 3.6 Wishlist / mood board

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-60 | Customer can save products to a list without an account (stored in the browser) | M |
| PW-61 | Saved list can be attached to one booking in a single step | M |
| PW-62 | Shareable link to the list (e.g. for a wedding planner) | C |

### 3.7 Customer gallery

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-70 | "Happy customers" page with photos submitted by customers | M |
| PW-71 | Submission form: photo, first name (optional), short note, consent checkbox | M |
| PW-72 | Nothing appears publicly until the owner approves it in the dashboard | M |

### 3.8 Other public pages

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-40 | About page: the owner's story, Bangladeshi heritage, handmade quality | M |
| PW-41 | How it works page (browse → book → consult → create → pickup or post) | M |
| PW-42 | Contact page with form, WhatsApp, social links, area served | M |
| PW-43 | FAQ page | S |
| PW-44 | Gallery / lookbook separate from the catalogue | C |
| PW-45 | Privacy policy and terms pages | M |
| PW-46 | Branded 404 page | S |
| PW-47 | WhatsApp chat button on every public page, opening a chat with the studio's number (click-to-chat link) | M |
| PW-48 | Delivery note: the studio offers pickup and postal delivery Australia-wide, arranged during the consultation. Shown on How it works, the FAQ and each product page. The app has no delivery options, costs or tracking | M |

### 3.9 Language

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-80 | English / Bengali toggle, persisted for the visitor | M |
| PW-81 | All UI strings translated; product content translated where the owner provides it, otherwise falls back to English | M |
| PW-82 | Bengali rendered with a proper font (Noto Sans Bengali or similar) | M |

### 3.10 Seasonal theming

| ID | Requirement | Priority |
| --- | --- | --- |
| PW-90 | A small set of themes (default, Eid, Christmas and New Year, Valentine's, Mother's Day — to confirm) changing colours, hero imagery and accents | M |
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
| OD-18 | Optional starting price per product, in whole AUD dollars | M |
| OD-19 | Optional video link per product | C |

### 4.3 Appointment management

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-20 | Calendar and list view of bookings (upcoming, past, cancelled) | M |
| OD-21 | Set weekly availability, slot length, buffer time, blocked dates/holidays | M |
| OD-22 | Confirm, reschedule, cancel bookings; customer gets an email | M |
| OD-23 | Booking status (New, Confirmed, Done, Cancelled) and private notes | M |
| OD-24 | One-tap reply to the customer on WhatsApp (prefilled message) or by email from the booking | M |
| OD-25 | Google Calendar sync | S |
| OD-26 | View the custom-order brief and attached wishlist on each booking | M |

### 4.4 Content and settings

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-30 | Edit hero text, about text, FAQ, contact details (WhatsApp number, email), social links, delivery note | M |
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

### 4.6 Progressive Web App

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-60 | Dashboard installable on the owner's phone (manifest, icons, offline shell) | M |
| OD-61 | Push notification on new booking and new gallery submission | M |

### 4.7 Handover

| ID | Requirement | Priority |
| --- | --- | --- |
| OD-50 | Plain-language help text inside the dashboard | M |
| OD-51 | Short owner's guide and a walkthrough session | M |
| OD-52 | One-off import of the owner's existing product spreadsheet (names, descriptions) into draft products, run by the team | S |

## 5. Deferred features (not in v1)

3D live mug/t-shirt preview · occasion reminders · gift quiz · order status tracker with delivery estimate · online or deposit payments · automated WhatsApp messages (needs the WhatsApp Business Platform, Meta business verification and approved message templates) · Meta Business Suite integration · AI caption helper · Instagram auto-import · consultation vouchers. Keep the data model open to these where cheap.

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
| NF-10 | Localisation | Correct Bengali rendering; Australian date format; Melbourne time zone; prices in AUD |
| NF-11 | Browser support | Latest two versions of major browsers plus in-app Facebook/Instagram browsers |
| NF-12 | Analytics | Privacy-friendly analytics visible in the dashboard |

## 7. Tech stack

Next.js 16 + TypeScript on Netlify · Tailwind v4 + shadcn/ui · Framer Motion · Supabase (Postgres, Auth, Storage, Sydney) · Drizzle ORM · React Hook Form + Zod · Resend + React Email · Cloudflare Turnstile · Umami analytics · Vitest + Playwright · pnpm.

## 8. Architecture

Customer and owner both use one Next.js deployment. Admin routes are protected server-side by Supabase Auth. All data and images live in Supabase. The app talks to Resend, Google Calendar and Turnstile only from the server. WhatsApp is reached only through click-to-chat links (`wa.me`); there is no WhatsApp API.

## 9. Open questions

- Consultation types (in person, phone, video) and the pickup location
- Working hours, slot length, booking horizon
- Personalisation options per product
- Logo (she may refresh it), colours, fonts, reference sites
- Bengali: who writes the translations
- Testimonials and customer photos permission
- Domain (.com.au is possible with her ABN) and business email
- Her product spreadsheet, for the import (OD-52)
- Launch date

## 10. Changes in v1.0 (client meeting, 5 Oct 2026)

- **Starting prices.** Products can show "From $X" (PW-14, PW-21, OD-18). This replaces "no prices anywhere". Still no cart, checkout or payments.
- **WhatsApp first.** The booking form asks for a WhatsApp number (PW-30); a WhatsApp button is on every public page (PW-47); one-tap WhatsApp reply is now a must-have (OD-24); confirmation and notification emails carry WhatsApp links (PW-34, PW-35). Automated WhatsApp messages are deferred.
- **Delivery.** Pickup or post Australia-wide, arranged in the consultation. The site only states this (PW-48, PW-41).
- **Categories and occasions** updated from her product range (PW-03, PW-04).
- **Business orders.** Corporate customers are handled in the wizard (PW-50); the separate corporate form left the deferred list.
- **Brand story.** About the maker and the About page tell her story (PW-05, PW-40); a signature designs section (PW-09).
- **New smaller items.** Product video links (PW-27, OD-19) and an import of her product spreadsheet (OD-52).
- **Business.** She has an ABN, so a .com.au domain is possible.
- Everything else in v0.2 stays in v1.
