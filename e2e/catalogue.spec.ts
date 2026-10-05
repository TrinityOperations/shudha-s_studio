import { expect, test } from "@playwright/test";
import { Client } from "pg";

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
const prefix = `E2E Catalogue ${Date.now()}`;

test.describe("public catalogue (PW-10..PW-26)", () => {
  test.skip(!databaseUrl, "Set DIRECT_DATABASE_URL or DATABASE_URL to run catalogue e2e");

  let client: Client;
  let categoryId: string;
  let occasionId: string;
  let tagId: string;
  let matchingSlug: string;

  test.beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const suffix = Date.now().toString(36);
    const category = await client.query<{ id: string }>(
      `insert into categories (slug, name, name_bn, sort_order)
       values ($1, $2, $3, 999) returning id`,
      [`e2e-category-${suffix}`, `${prefix} Category`, "পরীক্ষার ক্যাটাগরি"],
    );
    const occasion = await client.query<{ id: string }>(
      `insert into occasions (slug, name, name_bn, sort_order)
       values ($1, $2, $3, 999) returning id`,
      [`e2e-occasion-${suffix}`, `${prefix} Occasion`, "পরীক্ষার উপলক্ষ"],
    );
    const tag = await client.query<{ id: string }>(
      `insert into tags (slug, name, name_bn)
       values ($1, $2, $3) returning id`,
      [`e2e-tag-${suffix}`, `${prefix} Tag`, "পরীক্ষার ট্যাগ"],
    );
    categoryId = category.rows[0].id;
    occasionId = occasion.rows[0].id;
    tagId = tag.rows[0].id;

    matchingSlug = `e2e-bengali-mug-${suffix}`;
    const product = await client.query<{ id: string }>(
      `insert into products
        (slug, title, title_bn, description, description_bn, category_id, status, featured, published_at, turnaround_days)
       values ($1, $2, $3, $4, $5, $6, 'published', true, now(), 7)
       returning id`,
      [
        matchingSlug,
        `${prefix} Bengali Mug`,
        "বাংলা পরীক্ষার মগ",
        "A published catalogue fixture.",
        "একটি প্রকাশিত পরীক্ষার পণ্য।",
        categoryId,
      ],
    );
    await client.query(`insert into product_occasions (product_id, occasion_id) values ($1, $2)`, [
      product.rows[0].id,
      occasionId,
    ]);
    await client.query(`insert into product_tags (product_id, tag_id) values ($1, $2)`, [
      product.rows[0].id,
      tagId,
    ]);
    await client.query(
      `insert into product_images
        (product_id, path, thumb_path, alt, width, height, sort_order)
       values
        ($1, $2, $3, 'First catalogue test image', 1200, 1200, 0),
        ($1, $4, $5, 'Second catalogue test image', 1200, 1200, 1)`,
      [
        product.rows[0].id,
        `e2e/${suffix}-one.webp`,
        `e2e/${suffix}-one-thumb.webp`,
        `e2e/${suffix}-two.webp`,
        `e2e/${suffix}-two-thumb.webp`,
      ],
    );

    await client.query(
      `insert into products (slug, title, description, category_id, status)
       values ($1, $2, '', $3, 'draft')`,
      [`e2e-hidden-draft-${suffix}`, `${prefix} Hidden Draft`, categoryId],
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    await client.query(`delete from products where title like $1`, [`${prefix}%`]);
    await client.query(`delete from tags where id = $1`, [tagId]);
    await client.query(`delete from occasions where id = $1`, [occasionId]);
    await client.query(`delete from categories where id = $1`, [categoryId]);
    await client.end();
  });

  test("combined filters and Bengali search stay in the URL and open a published product", async ({
    page,
  }) => {
    await page.goto("/products");
    await page.getByLabel(/^search$/i).fill("বাংলা পরীক্ষার");
    await page.getByLabel(/^category$/i).selectOption({ label: `${prefix} Category` });
    await page.getByLabel(/^occasion$/i).selectOption({ label: `${prefix} Occasion` });
    await page.getByLabel(/^tag$/i).selectOption({ label: `${prefix} Tag` });
    await page.getByLabel(/^sort$/i).selectOption("featured");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE/);
    await expect(page).toHaveURL(/category=e2e-category-/);
    await expect(page).toHaveURL(/occasion=e2e-occasion-/);
    await expect(page).toHaveURL(/tag=e2e-tag-/);
    await expect(page).toHaveURL(/sort=featured/);
    await expect(page.getByRole("heading", { name: `${prefix} Bengali Mug` })).toBeVisible();
    await expect(page.getByText(`${prefix} Hidden Draft`)).toHaveCount(0);

    await page.getByRole("link", { name: new RegExp(`${prefix} Bengali Mug`, "i") }).click();
    await expect(page).toHaveURL(`/products/${matchingSlug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: `${prefix} Bengali Mug` }),
    ).toBeVisible();
    const zoomButton = page.getByRole("button", {
      name: new RegExp(`enlarge image of ${prefix} Bengali Mug`, "i"),
    });
    await zoomButton.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Image 2 of 2", { exact: true })).toBeAttached();
    await expect(page.getByRole("link", { name: /book an appointment/i })).toHaveAttribute(
      "href",
      `/book?product=${matchingSlug}`,
    );
  });
});
