/**
 * Idempotent seed: `pnpm db:seed`. Safe to re-run; never overwrites existing rows.
 * Category and occasion lists follow the client meeting (SRS v1.0, PW-03/PW-04). The owner edits them in the dashboard.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { db } = await import("./index");
  const { availabilityRules, bookingSettings, categories, faqs, occasions, siteSettings, tags } =
    await import("./schema");
  const { defaultGeneralSettings } = await import("@/lib/validators/settings");
  const { DEFAULT_AVAILABILITY_RULES, DEFAULT_BOOKING_SETTINGS } =
    await import("@/lib/booking/defaults");

  await db
    .insert(siteSettings)
    .values({ key: "general", value: defaultGeneralSettings })
    .onConflictDoNothing();

  // Booking defaults (slice #4): the singleton and Mon–Sat 10:00–18:00, only when none exist yet.
  await db
    .insert(bookingSettings)
    .values({ id: 1, ...DEFAULT_BOOKING_SETTINGS })
    .onConflictDoNothing();
  const existingRules = await db
    .select({ id: availabilityRules.id })
    .from(availabilityRules)
    .limit(1);
  if (existingRules.length === 0) {
    await db.insert(availabilityRules).values(DEFAULT_AVAILABILITY_RULES);
  }

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

  // PW-43, PW-48: the delivery question every customer asks, only when the FAQ is still empty.
  const existingFaqs = await db.select({ id: faqs.id }).from(faqs).limit(1);
  if (existingFaqs.length === 0) {
    await db.insert(faqs).values({
      question: "Do you deliver?",
      questionBn: "আপনারা কি ডেলিভারি করেন?",
      answer:
        "Yes. You can pick up in Melbourne or we post anywhere in Australia. We arrange it with you during the consultation.",
      answerBn:
        "হ্যাঁ। আপনি মেলবোর্নে পিকআপ করতে পারেন, বা আমরা অস্ট্রেলিয়ার যেকোনো জায়গায় ডাকযোগে পাঠাই। পরামর্শের সময় আপনার সাথে ঠিক করে নিই।",
      sortOrder: 0,
      published: true,
    });
  }

  // The "signature" tag drives the home page's signature designs section (PW-09).
  await db
    .insert(tags)
    .values({ slug: "signature", name: "Signature", nameBn: "সিগনেচার" })
    .onConflictDoNothing();

  console.log(
    "Seed complete: site_settings, booking_settings, availability_rules, categories, occasions, tags, faqs",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
