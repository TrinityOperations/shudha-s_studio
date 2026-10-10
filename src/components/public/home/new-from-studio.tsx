import Link from "next/link";
import { ProductCard } from "@/components/public/catalogue/product-card";
import type { CatalogueCard } from "@/db/queries/catalogue";
import type { Category } from "@/db/schema";
import { getLocale, getT } from "@/lib/i18n";
import { HOME_NEW_PICKS_MAX } from "@/lib/validators/settings";
import { Carousel } from "./carousel";
import { SectionHeading } from "./section-heading";
import { SlotFrame } from "./slot-frame";

type Props = { products: CatalogueCard[]; categories: Category[]; editing?: boolean };

/** PW-02 and PW-04: the owner's picks (or the newest eight) under a row of category chips. */
export async function NewFromStudio({ products, categories, editing = false }: Props) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  if (products.length === 0 && categories.length === 0 && !editing) return null;
  const title = t("home.new.title");
  const shown = products.map((p) => p.id);
  const slots = editing
    ? Array.from({ length: HOME_NEW_PICKS_MAX }, (_, i) => products[i] ?? null)
    : [];
  return (
    <section
      aria-labelledby="new-heading"
      className="mx-auto w-full max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <SectionHeading
        id="new-heading"
        title={title}
        action={
          <Link
            href="/products"
            className="text-ink text-[15px] font-medium underline underline-offset-[5px]"
          >
            {t("home.new.link")}
          </Link>
        }
      />
      {categories.length ? (
        <nav aria-label={t("home.new.categories")} className="mt-6">
          <ul className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {categories.map((category) => (
              <li key={category.id} className="shrink-0">
                <Link href={`/products?category=${category.slug}`} className="chip">
                  {locale === "bn" && category.nameBn ? category.nameBn : category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {editing ? (
        <Carousel label={title} className="mt-8">
          {slots.map((product, i) => (
            <li
              key={product?.id ?? `empty-${i}`}
              className="w-[230px] shrink-0 snap-start sm:w-[260px]"
            >
              <SlotFrame
                slots={[
                  {
                    id: `new.${i}`,
                    label: t("admin.editor.slots.new", { n: i + 1 }),
                    shape: "square",
                    kind: "product",
                    filled: !!product,
                    shownProductIds: shown,
                  },
                ]}
              >
                {product ? (
                  <ProductCard product={product} />
                ) : (
                  <div
                    className="bg-mist border-line aspect-[4/5] border"
                    data-placeholder="new-tile"
                  />
                )}
              </SlotFrame>
            </li>
          ))}
        </Carousel>
      ) : products.length ? (
        <Carousel label={title} className="mt-8">
          {products.map((product) => (
            <li key={product.id} className="w-[230px] shrink-0 snap-start sm:w-[260px]">
              <ProductCard product={product} />
            </li>
          ))}
        </Carousel>
      ) : null}
    </section>
  );
}
