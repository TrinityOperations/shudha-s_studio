/**
 * Idempotent seed: `pnpm db:seed`. Safe to re-run; never overwrites existing rows.
 * Category and occasion lists follow the client meeting (SRS v1.0, PW-03/PW-04). The owner edits them in the dashboard.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { db } = await import("./index");
  const { bookingSettings, categories, occasions, siteSettings } = await import("./schema");
  const { defaultGeneralSettings } = await import("@/lib/validators/settings");

  await db
    .insert(siteSettings)
    .values({ key: "general", value: defaultGeneralSettings })
    .onConflictDoNothing();

  await db.insert(bookingSettings).values({ id: 1 }).onConflictDoNothing();

  const categoryRows = [
    { slug: "chocolate-wrappers", name: "Chocolate wrappers", nameBn: "চকলেট র‍্যাপার" },
    { slug: "nameplates", name: "Nameplates", nameBn: "নেমপ্লেট" },
    { slug: "cards", name: "Cards", nameBn: "কার্ড" },
    { slug: "posters", name: "Posters", nameBn: "পোস্টার" },
    { slug: "mugs", name: "Mugs", nameBn: "মগ" },
    { slug: "apparel", name: "Apparel", nameBn: "পোশাক" },
    { slug: "home-decor", name: "Home decor", nameBn: "ঘর সাজানোর সামগ্রী" },
    { slug: "keyrings", name: "Keyrings", nameBn: "কি-রিং" },
    { slug: "cushions", name: "Cushions", nameBn: "কুশন" },
    { slug: "gift-packs", name: "Gift packs", nameBn: "গিফট প্যাক" },
  ].map((row, sortOrder) => ({ ...row, sortOrder }));
  await db.insert(categories).values(categoryRows).onConflictDoNothing();

  const occasionRows = [
    { slug: "birthday", name: "Birthday", nameBn: "জন্মদিন" },
    { slug: "anniversary", name: "Anniversary", nameBn: "বিবাহবার্ষিকী" },
    { slug: "wedding", name: "Wedding", nameBn: "বিয়ে" },
    { slug: "christmas", name: "Christmas", nameBn: "বড়দিন" },
    { slug: "new-year", name: "New Year", nameBn: "নতুন বছর" },
    { slug: "corporate", name: "Corporate", nameBn: "কর্পোরেট" },
    { slug: "eid", name: "Eid", nameBn: "ঈদ" },
    { slug: "baby", name: "Baby", nameBn: "নবজাতক" },
    { slug: "graduation", name: "Graduation", nameBn: "গ্র্যাজুয়েশন" },
  ].map((row, sortOrder) => ({ ...row, sortOrder }));
  await db.insert(occasions).values(occasionRows).onConflictDoNothing();

  console.log("Seed complete: site_settings, booking_settings, categories, occasions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
