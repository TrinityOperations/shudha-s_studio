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
