/**
 * Demo content for the home page showcase.
 *
 *   pnpm demo:seed    adds the products, photos, settings, sample quotes and gallery tiles
 *   pnpm demo:clear   removes exactly what demo:seed created (manifest.json records every id)
 *
 * Runs under plain Node (tsx) with .env.local, like src/db/seed.ts. Images go through the same
 * sharp settings as the product upload action (1600px full + 400px thumb, webp). Everything
 * created is listed in scripts/demo-content/manifest.json so the clear step is exact.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { eq, inArray } from "drizzle-orm";

config({ path: ".env.local" });

const ROOT = resolve(process.cwd(), "scripts/demo-content");
const PHOTOS = resolve(ROOT, "photos");
const MANIFEST = resolve(ROOT, "manifest.json");
const CONTENT = resolve(ROOT, "content.json");

const PRODUCT_BUCKET = "product-images";
const SITE_BUCKET = "site-images";
const GALLERY_BUCKET = "gallery-images";
const DEMO_TAG = "demo";
/** Unique folder per seed run, so re-seeding changes every URL and no browser or CDN cache can show an old file. */
const RUN = `demo-${Date.now().toString(36)}`;

type Focus = { x: number; y: number };
type PhotoRef = { photo: string; focus: Focus };
type ProductDef = {
  key: string;
  slug: string;
  title: string;
  titleBn: string;
  category: string;
  occasions: string[];
  tags: string[];
  priceFrom: number;
  description: string;
  personalisation: string[];
  photo: string;
  alt: string;
};
type Content = {
  products: ProductDef[];
  siteImages: {
    heroPoster: PhotoRef;
    heroVideo?: string;
    signaturePanel: PhotoRef;
    madeForYou: PhotoRef;
    collage: PhotoRef[];
  };
  occasionTiles: Record<string, string>;
  signaturePicks: string[];
  newPicks: string[];
  announcement: { messages: { text: string; linkLabel: string; href: string }[] };
  seasonalBanner: { enabled: boolean };
  testimonials: { authorName: string; quote: string }[];
  gallery: { photo: string; firstName: string }[];
};
type Manifest = {
  productIds: string[];
  productImagePaths: string[];
  siteImagePaths: string[];
  galleryImagePaths: string[];
  testimonialIds: string[];
  galleryIds: string[];
  settingsKeys: string[];
  tagIds: string[];
};

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).storage;
}

async function processImage(file: string) {
  const input = readFileSync(resolve(PHOTOS, file));
  const source = sharp(input, { failOn: "error" }).rotate();
  const full = await source
    .clone()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await source
    .clone()
    .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  return { full: full.data, thumb, width: full.info.width, height: full.info.height };
}

async function upload(bucket: string, path: string, body: Buffer, contentType = "image/webp") {
  const { error } = await storage()
    .from(bucket)
    .upload(path, body, { contentType, upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
}

/**
 * The hero video lives in `site-images` (docs/design.md), but migration 0001 only allows image
 * types there. Widen the bucket for the demo; #10's migration makes this permanent.
 */
async function allowVideoInSiteImages() {
  const { error } = await storage().updateBucket(SITE_BUCKET, {
    public: true,
    fileSizeLimit: 10485760,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/svg+xml",
      "video/mp4",
    ],
  });
  if (error) throw new Error(`updateBucket ${SITE_BUCKET}: ${error.message}`);
}

async function remove(bucket: string, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await storage().from(bucket).remove(paths);
  if (error) console.warn(`remove from ${bucket}: ${error.message}`);
}

async function seed() {
  if (existsSync(MANIFEST)) {
    throw new Error(
      "manifest.json exists: demo content is already loaded. Run `pnpm demo:clear` first.",
    );
  }
  const content = JSON.parse(readFileSync(CONTENT, "utf8")) as Content;

  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { announcementSettingsSchema, homeSettingsSchema, seasonalBannerSettingsSchema } =
    await import("@/lib/validators/settings");

  const manifest: Manifest = {
    productIds: [],
    productImagePaths: [],
    siteImagePaths: [],
    galleryImagePaths: [],
    testimonialIds: [],
    galleryIds: [],
    settingsKeys: [],
    tagIds: [],
  };
  const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  // Taxonomy lookups (seeded by `pnpm db:seed`).
  const categories = new Map(
    (await db.select().from(schema.categories)).map((c) => [c.slug, c.id]),
  );
  const occasions = new Map((await db.select().from(schema.occasions)).map((o) => [o.slug, o.id]));
  const tagRows = await db.select().from(schema.tags);
  const tags = new Map(tagRows.map((t) => [t.slug, t.id]));
  for (const slug of ["signature", DEMO_TAG]) {
    if (!tags.has(slug)) {
      const [row] = await db
        .insert(schema.tags)
        .values({
          slug,
          name: slug === DEMO_TAG ? "Demo" : "Signature",
          nameBn: slug === DEMO_TAG ? "ডেমো" : "সিগনেচার",
        })
        .returning({ id: schema.tags.id });
      tags.set(slug, row.id);
      if (slug === DEMO_TAG) manifest.tagIds.push(row.id);
    }
  }
  for (const p of content.products) {
    if (!categories.has(p.category))
      throw new Error(`unknown category ${p.category} (run pnpm db:seed)`);
    for (const o of p.occasions) if (!occasions.has(o)) throw new Error(`unknown occasion ${o}`);
  }

  // Products, newest first in the list: publishedAt steps back one minute per product so the
  // "newest" ordering on the home page matches the order in content.json.
  const idByKey = new Map<string, string>();
  const now = Date.now();
  for (const [i, p] of content.products.entries()) {
    const existing = await db.query.products.findFirst({
      where: eq(schema.products.slug, p.slug),
      columns: { id: true },
    });
    const slug = existing ? `${p.slug}-demo` : p.slug;
    const publishedAt = new Date(now - i * 60_000);
    const [product] = await db
      .insert(schema.products)
      .values({
        slug,
        title: p.title,
        titleBn: p.titleBn || null,
        description: p.description,
        personalisation: { options: p.personalisation, notes: "" },
        priceFrom: p.priceFrom,
        categoryId: categories.get(p.category)!,
        status: "published",
        publishedAt,
        createdAt: publishedAt,
      })
      .returning({ id: schema.products.id });
    manifest.productIds.push(product.id);
    idByKey.set(p.key, product.id);
    save();

    const img = await processImage(p.photo);
    const key = randomUUID();
    const path = `${product.id}/${key}.webp`;
    const thumbPath = `${product.id}/${key}-thumb.webp`;
    await upload(PRODUCT_BUCKET, path, img.full);
    await upload(PRODUCT_BUCKET, thumbPath, img.thumb);
    manifest.productImagePaths.push(path, thumbPath);
    save();
    await db.insert(schema.productImages).values({
      productId: product.id,
      path,
      thumbPath,
      alt: p.alt,
      width: img.width,
      height: img.height,
      sortOrder: 0,
    });

    if (p.occasions.length) {
      await db
        .insert(schema.productOccasions)
        .values(p.occasions.map((o) => ({ productId: product.id, occasionId: occasions.get(o)! })));
    }
    const tagSlugs = [...new Set([...p.tags, DEMO_TAG])];
    await db
      .insert(schema.productTags)
      .values(tagSlugs.map((t) => ({ productId: product.id, tagId: tags.get(t)! })));
    console.log(`product ${p.title} (${slug})`);
  }

  // Site images for the home page slots.
  const siteSlot = async (name: string, ref: PhotoRef) => {
    const img = await processImage(ref.photo);
    const path = `${RUN}/${name}.webp`;
    const thumbPath = `${RUN}/${name}-thumb.webp`;
    await upload(SITE_BUCKET, path, img.full);
    await upload(SITE_BUCKET, thumbPath, img.thumb);
    manifest.siteImagePaths.push(path, thumbPath);
    save();
    return { path, thumbPath, focus: ref.focus };
  };
  const heroPoster = await siteSlot("hero-poster", content.siteImages.heroPoster);
  let heroVideoPath: string | null = null;
  if (content.siteImages.heroVideo) {
    await allowVideoInSiteImages();
    heroVideoPath = `${RUN}/hero.mp4`;
    await upload(
      SITE_BUCKET,
      heroVideoPath,
      readFileSync(resolve(PHOTOS, content.siteImages.heroVideo)),
      "video/mp4",
    );
    manifest.siteImagePaths.push(heroVideoPath);
    save();
  }
  const signaturePanel = await siteSlot("signature-panel", content.siteImages.signaturePanel);
  const madeForYou = await siteSlot("made-for-you", content.siteImages.madeForYou);
  const collage = [];
  for (const [i, ref] of content.siteImages.collage.entries())
    collage.push(await siteSlot(`collage-${i + 1}`, ref));

  const occasionTiles: Record<string, { productId: string }> = {};
  for (const [slug, key] of Object.entries(content.occasionTiles)) {
    if (!occasions.has(slug)) throw new Error(`unknown occasion ${slug}`);
    occasionTiles[slug] = { productId: idByKey.get(key)! };
  }
  const homeContent = {
    heroVideoPath,
    heroPoster,
    signaturePanel,
    madeForYou,
    portrait: null,
    collage,
    occasionTiles,
    signaturePicks: content.signaturePicks.map((k) => idByKey.get(k)!),
    newPicks: content.newPicks.map((k) => idByKey.get(k)!),
  };
  const home = homeSettingsSchema.parse({ draft: homeContent, published: homeContent });
  const announcement = announcementSettingsSchema.parse(content.announcement);
  const seasonalBanner = seasonalBannerSettingsSchema.parse(content.seasonalBanner);
  for (const [key, value] of [
    ["home", home],
    ["announcement", announcement],
    ["seasonal_banner", seasonalBanner],
  ] as const) {
    await db
      .insert(schema.siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value } });
    manifest.settingsKeys.push(key);
  }
  save();
  console.log("site images and home, announcement, seasonal_banner settings");

  // Sample testimonials (clearly labelled) and gallery tiles.
  for (const [i, t] of content.testimonials.entries()) {
    const [row] = await db
      .insert(schema.testimonials)
      .values({ authorName: t.authorName, quote: t.quote, sortOrder: i, visible: true })
      .returning({ id: schema.testimonials.id });
    manifest.testimonialIds.push(row.id);
  }
  for (const [i, g] of content.gallery.entries()) {
    const img = await processImage(g.photo);
    const path = `${RUN}/gallery-${i + 1}.webp`;
    const thumbPath = `${RUN}/gallery-${i + 1}-thumb.webp`;
    await upload(GALLERY_BUCKET, path, img.full);
    await upload(GALLERY_BUCKET, thumbPath, img.thumb);
    manifest.galleryImagePaths.push(path, thumbPath);
    save();
    const [row] = await db
      .insert(schema.gallerySubmissions)
      .values({
        imagePath: path,
        thumbPath,
        publicImagePath: path,
        publicThumbPath: thumbPath,
        firstName: g.firstName,
        note: "demo",
        consentGiven: true,
        status: "approved",
        reviewedAt: new Date(now - i * 60_000),
      })
      .returning({ id: schema.gallerySubmissions.id });
    manifest.galleryIds.push(row.id);
  }
  save();
  console.log(
    `done: ${manifest.productIds.length} products, ${manifest.testimonialIds.length} quotes, ${manifest.galleryIds.length} gallery tiles`,
  );
}

async function clear() {
  if (!existsSync(MANIFEST)) {
    console.log("No manifest.json: nothing to clear.");
    return;
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");

  if (manifest.productIds.length)
    await db.delete(schema.products).where(inArray(schema.products.id, manifest.productIds));
  if (manifest.testimonialIds.length)
    await db
      .delete(schema.testimonials)
      .where(inArray(schema.testimonials.id, manifest.testimonialIds));
  if (manifest.galleryIds.length)
    await db
      .delete(schema.gallerySubmissions)
      .where(inArray(schema.gallerySubmissions.id, manifest.galleryIds));
  if (manifest.settingsKeys.length)
    await db
      .delete(schema.siteSettings)
      .where(inArray(schema.siteSettings.key, manifest.settingsKeys));
  if (manifest.tagIds.length)
    await db.delete(schema.tags).where(inArray(schema.tags.id, manifest.tagIds));
  await remove(PRODUCT_BUCKET, manifest.productImagePaths);
  await remove(SITE_BUCKET, manifest.siteImagePaths);
  await remove(GALLERY_BUCKET, manifest.galleryImagePaths);
  unlinkSync(MANIFEST);
  console.log("Demo content removed.");
}

const mode = process.argv[2];
(mode === "clear"
  ? clear()
  : mode === "seed"
    ? seed()
    : Promise.reject(new Error("usage: seed | clear"))
)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
