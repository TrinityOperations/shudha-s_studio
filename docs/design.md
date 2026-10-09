# Shudha's Studio design

## Who decided what
- Shudha left the design to Sayek: "visually appealing, clean and artistic; colour not too much, just enough to make the pictures pop."
- References: **Minted** (structure, video hero, components), **Papier** (centred header, signature section layout, reviews), **Not On The High Street** (maker spotlight). Ideas adapted to our context, not copies.

## Direction: "the gift tag"
A calm, photo-first page with one motif from the studio's own work: a white gift tag with a punched hole and a red thread, used wherever a label is needed (occasion tiles, signature tiles, prices, quote credits, the seasonal banner). Everything else is quiet so her photos carry the colour.

## Colour
CSS variables in `globals.css`. Components never use raw hex. Seasonal themes (#13) swap only `accent` (buttons, banner, footer).

| Token | Hex | Use |
| --- | --- | --- |
| paper | #FBF9F6 | page ground, header, announcement strip |
| white | #FFFFFF | tags, product photos, cards, "Made just for you" panel |
| mist | #EDF0EA | soft tags, image placeholders, Bengali panel |
| line | #E3DDD3 | borders, dividers |
| ink | #2A2420 | text, outlined buttons |
| ink-soft | #4E4740 | hero and section sub text |
| muted | #6B635B | categories, captions, small text (≥ 4.5:1 on paper and mist) |
| accent (Bengal green) | #1E4A3A | primary buttons, seasonal banner, footer, chips when on, link hover |
| mark (sindoor) | #C2402A | thread, dots, step numbers, saved heart, Bangla accent lines |
| scrim | rgba(26,22,19,…) | dark overlays on photos (signature panel gradient 0.75 → 0.1) |

Seasonal accents for #13: Everyday Bengal green #1E4A3A, Eid indigo #2D4356, Wedding season plum #5B3F4E, Christmas and New Year garnet #6E2B2B. `mark` stays sindoor in every theme.

Map the shadcn variables onto these so the dashboard follows without its own styling: `--background` paper, `--foreground` ink, `--primary` accent, `--primary-foreground` white, `--border` line, `--muted` mist, `--muted-foreground` muted, `--ring` accent.

## Type
- Headings: **Eczar** (Google Fonts via `next/font`, weights 400 and 500, latin). Display 38–58 (`clamp(38px, 4.4vw, 58px)`), section headings 40 (30 on phones), feature headings 44, product titles 20, quotes 21–22, facts strip 22. Letter-spacing −0.01em on display sizes.
- Body and UI: **Geist** (already in the app), 16–18; small text 13 for categories and captions; nav and buttons 15, weight 500.
- Bengali: headings **Tiro Bangla**, body **Noto Sans Bengali** (already in the app). Load Bengali web fonts only on `bn` pages; the header's "বাংলা" toggle uses the system Bengali font so English pages don't pull the web font (fixes the #3 Lighthouse 88–92).
- **Sentence case everywhere** (Bengali has no capitals, so no all-caps labels or buttons).

## Shapes and components
- **Buttons:** pills (`border-radius: 999px`), 14px 26px padding. Primary: accent with white text. On dark bands: white with ink text. Secondary: white with a 1px ink border. Text links: weight 500, underlined, 4–5px offset. All targets ≥ 44px. Focus ring: 2px accent, 3px offset.
- **Photos:** square corners everywhere except the two round collage slots. Product images 4:5 on white with a 1px line border; occasion and customer tiles 3:4; signature tiles 1:1; portrait 4:5. Image placeholders are mist.
- **The tag:** white (or mist for the quiet version), ink text, weight 500, a small ring (border 1.5px ink) as the punched hole, and a pointed left end made with `clip-path: polygon(13px 0, 100% 0, 100% 100%, 13px 100%, 0 50%)`. Sizes: tag on a photo 15px / padding 10px 18px 10px 24px; quiet price tag 13px / 6px 12px 6px 18px (`clip-path` point 10px); quote credit 14px (point 11px). Hanging tags (occasion tiles, customer tiles, portrait) sit top-left, rotated −5°, with a 1.5px × 26px `mark` thread from the tile's top edge at left 31px.
- **Filter chip:** pill, 1px ink border, 14px; on = accent background, white text.
- **Step marker:** 30px circle in `mark`, white number, weight 600.
- **Product card** (`ProductCard` from #3, restyled): 4:5 image on white with line border; heart button 44px paper circle top-right (saved = heart filled `mark`); category 13 muted; title Eczar 20; "From $X" quiet tag when a price is set, nothing when not; second photo on hover when there is one.
- **Carousel controls:** 44px round white buttons with a line border, chevron icons; carousels snap-scroll, scrollbar hidden, swipe on phones.

## Header
Sticky, paper background, 1px line underneath. Desktop is a three-column grid:
- Left: nav Occasions · All gifts · Custom order · Happy customers · About Shudha (15px, weight 500).
- Centre: the logo mark (40px circle; a placeholder "S" in `mark` until her logo file arrives) with "Shudha's Studio" in Eczar 30 beside it.
- Right: wishlist heart (44px, count badge in `mark`), "বাংলা" toggle, primary pill "Book a consultation".

At the top of the page the centre shows mark + name. Once the hero has scrolled out of view the name fades out, only the mark stays, and the bar gets shorter (18px → 10px vertical padding). Scrolling back to the top brings the name back. Under reduced motion the switch is instant.

Phone: menu button left, mark + name centred (32px mark, Eczar 22), heart right. Same collapse behaviour. The menu opens a full-height sheet with the nav, the toggle and the Book button.

Above the header: the **announcement strip** (paper, 1px line below, 14px text with a `mark` dot and one link). Owner-editable in #10 (OD-33); #9 reads the setting and hides the strip when it is empty. Several messages cross-fade every ~6 s and pause on hover or focus.

## Home page, top to bottom
1. **Hero.** Full-bleed looping muted video, 720px tall on desktop and 640px on phones (portrait cut), poster image first, a 44px round pause button top-right. Over it, bottom-left, the **frosted welcome card**: paper at 40% with `backdrop-filter: blur(28px) saturate(1.2)`, 1px white border at 60%, 16px radius (14px on phones), shadow `0 24px 60px rgba(26,22,19,0.25)`, padding 48px 56px, max width 640px. Inside: the Bangla line "কারো আনন্দের কারণ হোন" in Tiro Bangla 22 in `mark`; H1 "Be a reason for someone's happiness" in Eczar display; sub "Personalised gifts, handmade in Melbourne. Names, dates and messages in Bangla or English." (18px ink-soft); primary pill "Book a free consultation" and text link "Start a custom order". The card never leaves the video area. Browsers without `backdrop-filter` get paper at 85%. Video and poster are site images (editor in #10); until she uploads them the poster is a mist block and there is no video.
2. **Studio facts strip.** Eczar 22 marquee between 1px lines: Handmade in Melbourne · Bangla or English lettering · A free consultation before anything is made · Pickup in Melbourne or post across Australia, separated by 8px `mark` dots. Scrolls slowly, pauses on hover, static under reduced motion.
3. **Shop by occasion** (PW-03). Heading 40 with prev/next controls on the right. Snap carousel of 3:4 tiles (min 250px, 24px gap; 220px on phones) with a hanging tag holding the occasion name. Occasions come from the `occasions` table in the owner's order. Tile image = the owner's choice from the home page editor, else the newest published product in that occasion, else mist. Links to `/products?occasion=<slug>`.
4. **Shudha's signature designs** (PW-09). Papier-style split: left, a tall panel (min 560px, flex 1 1 380px) with a site image behind a scrim gradient, white heading 44 "Shudha's signature designs", intro "The pieces she is known for, drawn from Bangladeshi craft and made to order with your names and dates." and white link "See all signature designs" (`/products?tag=signature`); right, a 2 × 2 grid of square tiles (flex 1.4 1 560px, 20px gap), each with a white tag bottom-left holding the product name. Products are the published ones tagged `signature`, newest first, capped at four; the section is hidden when there are none. On phones: the tall panel (min 360px) then the 2 × 2 grid.
5. **New from the studio** (PW-02). Heading 40 with "See all gifts" (`/products`) on the right. Directly under the heading, a row of **category chips** (PW-04) from the `categories` table in the owner's order, linking to `/products?category=<slug>`; they wrap on desktop and scroll on phones. Then a snap carousel of `ProductCard`s (min 230px): the owner's picks from the home page editor, else the newest eight published products.
6. **Made just for you.** White panel with a line border, split in two (each flex 1 1 400px): photo on the left (site image, min 520px; 260px tall on phones, on top); on the right, heading 44, intro "Tell Shudha the names, the date and the feeling you want to give. She talks it through with you, then makes it by hand.", the three real wizard steps with `mark` step markers (Choose a product, or start from an idea · Add names, dates, a message and photos · Pick a time for a free consultation), and a primary pill "Start a custom order" (`/custom-order`).
7. **Seasonal banner.** One big tag in `accent`: `clip-path: polygon(80px 0, 100% 0, 100% 100%, 80px 100%, 0 50%)`, a 26px white ring as the hole, a 1.5px `mark` thread drawn diagonally from the hole, padding 80px 72px 80px 160px, max width 1040px, centred text: small label (16px, white at 88%), Eczar headline `clamp(32px, 3.6vw, 48px)`, white pill button. Owner-editable with an on/off toggle (editor in #10, theme colour in #13); #9 reads the setting and hides the banner when off. Default copy: "Eid collection" / "Order early for Eid gifts. Consultations fill up in the last two weeks." / "Book a consultation".
8. **Hi, I'm Shudha** (PW-05). Left, a 4:5 portrait (flex 0 1 400px) with a hanging tag "Shudha, maker"; right, heading 40, her story in Eczar 22 (ink-soft #3A3430, max 600px), the signature "— শুধা" in Tiro Bangla 28 in `mark`, and the link "Read her story" (`/about`). Story text is a site setting (editor in #10); a marked placeholder paragraph until she sends it.
9. **Kind words** (PW-06). Heading 40, then three white cards with a line border (grid, min 300px): quote in Eczar 21 and a quiet-tag credit "[First name], what they ordered". Reads the `testimonials` table (editor in #10); hidden when empty. On phones the cards stack; no carousel.
10. **Happy customers** (gallery, #12). Heading 40 with "See the gallery" on the right; snap row of 3:4 tiles (min 220px; 180px on phones) with a hanging tag holding the customer's first name. Reads approved gallery photos; hidden until there are any.
11. **Follow the studio** (PW-07). Heading 40 with two outlined pill buttons on the right, each with its icon: "@shudhas.studio" (Instagram) and "Facebook". Below, a collage: 6-column grid, 190px rows, 16px gap, ten slots — (cols 1–2, rows 1–2) · (3–4, 1) · (5, 1) · (6, rows 1–2) · (3, 2, round) · (4–5, 2) · (1, 3) · (2–3, 3) · (4, 3, pill) · (5–6, 3). Phone: 3 columns, 116px rows, 8px gap, seven slots — (1–2, rows 1–2) · (3, 1) · (3, 2, round) · (1, 3) · (2–3, 3) · (1–2, 4) · (3, 4). Slots are site images (editor in #10), not a live feed; empty slots are mist. Links come from the social settings.
12. **Footer.** `accent` background, white text (86% for links): wordmark in Eczar 30, tagline "Personalised gifts, handmade in Melbourne.", Facebook / Instagram / WhatsApp icon links; columns Shop (Occasions, All gifts, Custom order, Wishlist), Studio (About Shudha, How it works, Happy customers, Questions), Help (Contact, Delivery and pickup, Privacy, Terms); bottom line "© 2026 Shudha's Studio, Melbourne" and "English | বাংলা" over a 25% white rule.
13. **Chat on WhatsApp** (PW-47). Fixed bottom-right on every public page: white pill, line border, shadow `0 8px 24px rgba(42,36,32,0.14)`, WhatsApp icon + "Chat on WhatsApp"; a round icon-only button on phones. `whatsappLink()` with the studio number from the `contact` settings; hidden when no number is set; never covers content at 360px.

## Motion
Framer Motion. Everything below is off under `prefers-reduced-motion`, which also shows the poster instead of the video.
- **On load, one moment:** the video fades in and the welcome card rises 24px into place, about 0.8 s total.
- **Header:** name fades and the bar shrinks once the hero leaves the viewport (one `IntersectionObserver` on the hero, no scroll listeners).
- **Signature designs:** the four tiles rise in one after another when the section enters the viewport; the tall photo drifts slowly (a light parallax, ≤ 40px). These are the only scroll animations; no generic fade-ups on other blocks.
- **Marquee** facts strip, slow, pauses on hover.
- **Responses to the visitor:** photo zoom 1.03 over 0.5 s inside tiles and collage slots; heart "pop" on save; carousels snap; announcement strip cross-fades every ~6 s; product card shows its second photo on hover.
- **Performance:** video `preload="metadata"`, poster as the LCP image via `next/image` with `priority`, skip the video on Save-Data and on phones with reduced data; mobile Lighthouse ≥ 90 performance, ≥ 95 accessibility.

## Data each section reads
| Section | Source |
| --- | --- |
| Announcement strip | `site_settings` key `announcement` (#10 editor); hidden when empty |
| Hero video, poster, signature panel photo, Made-just-for-you photo, portrait, collage slots, occasion tile overrides, New-from-the-studio picks | `site_settings` key `home` (schema defined in #9 in `src/lib/validators/settings.ts`: slot id → product id or image path, plus crop focus; a `draft` and a `published` copy). #9 reads `published` with defaults; #10 builds the editor |
| Shop by occasion | `occasions` table (owner's order), fallback image = newest published product in the occasion |
| Category chips | `categories` table (owner's order) |
| Signature designs | published products with the `signature` tag, newest first, max 4 |
| New from the studio | `home` picks, else newest 8 published products |
| Her story | `site_settings` key `about` (#10); placeholder until then |
| Seasonal banner | `site_settings` key `seasonal_banner` (#10 editor, #13 colour); hidden when off |
| Kind words | `testimonials` table (#10 editor); hidden when empty |
| Happy customers | approved `gallery_submissions` (#12); hidden when empty |
| Social links, WhatsApp | `site_settings` keys `social` (#10) and `contact` (exists) |

Site images live in a public `site-images` bucket, processed by the existing `sharp` pipeline (1600px + 400px webp), with the crop focus stored as `object-position`.

## Home page editor (decided 9 Oct; built in slice #10)
How Shudha changes the photos on the home page. Replaces the earlier idea of a list of named upload fields in Content settings.

**Entry:** one button in the dashboard, "Edit home page". It opens the real home page with an editing bar across the top: Save, Discard, Exit. Changes are held in the `draft` copy of the `home` key and go live on Save (copied to `published`), so a half-finished edit never shows to customers.

**Editable slots:** every photo on the page is a slot. On hover the photo dims and a "Change photo" button appears in the middle; on phones a tap does the same, and each slot carries a small pencil badge. The hero has "Change video" and "Change poster" instead.

**Change photo panel**, two tabs:
- **From products**: search box plus a grid of her product photos (published and draft products). Click one and it goes into the slot.
- **Upload**: drag in or pick a file, then a crop preview in the slot's shape (wide, tall 3:4, square) so she can pan to the part she wants before saving.

**Upload asks what the photo is:**
- *Just a photo*: goes into the slot, nothing else. Offered only on plain image slots.
- *A new product*: the existing product form from the Products page (name, category, description, "From $" price, occasion tags, EN and BN fields) opens inside the panel with the photo already attached, going through the same validation and image pipeline. Save creates the product, published, and puts it in the slot. A "Save as draft" link saves the product without placing it (a draft can't sit on the home page). Closing the panel mid-form keeps the photo and text as a draft product. More photos can be added later from the Products page.

**What each slot is:**
- Hero video and poster; occasion tiles; signature panel photo; "Made just for you" photo; her portrait; collage slots → plain image slots. Both tabs; Upload offers the "just a photo / new product" choice.
- Signature tiles; New from the studio → product slots. Picking a product puts that product in the slot with its name and price. Upload here is always a new product (no choice shown); in Signature designs, saving also adds the `signature` tag.
- Happy customers → not editable here. The slot says "Managed in Gallery" with a link.

**Later, not now:** text editing in the same mode. The structure allows it; #10 stays on photos so it ships.

**Build notes for #10:** the editing bar, slot overlays, picker panel and crop preview are new; the product form is #2's component in a panel. The Content settings page keeps only text (her story, delivery note, social links). Roughly a week on top of #10.

## Placeholders (until Shudha sends them)
Logo (the "S" mark), hero video and poster, site images (mist blocks; the Facebook photos in the mock-up are for the mock-up only), her portrait and story, real customer quotes, WhatsApp number (empty on live), hours (seeded defaults). Every placeholder is marked so one search finds them (`placeholder` flag or `[placeholder]` text); all are replaced before launch, most of them by Shudha through the home page editor.

## Decisions to record in `docs/DECISIONS.md` (#9 PR)
- Design B "the gift tag" chosen over design A "kantha stitch" on 9 Oct; accent is Bengal green; no stitch motif.
- Frosted welcome card over the hero video (40% paper + blur), rounded 16px; all other photos square-cornered.
- Centred header that collapses to the logo mark on scroll.
- PW-04 category shortcuts are a chip row under "New from the studio", not a separate section.
- Home page photos are managed in place through the home page editor (#10); `home` settings key with draft and published copies.
- "Follow the studio" is a collage of owner-chosen photos, not an Instagram feed (import deferred).
