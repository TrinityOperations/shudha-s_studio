import Link from "next/link";
import { ProductCard } from "@/components/public/catalogue/product-card";
import type { CatalogueCard } from "@/db/queries/catalogue";
import type { Category } from "@/db/schema";
import { getLocale, getT } from "@/lib/i18n";
import { Carousel } from "./carousel";
import { SectionHeading } from "./section-heading";

type Props = { products: CatalogueCard[]; categories: Category[] };

/** PW-02 and PW-04: the owner's picks (or the newest eight) under a row of category chips. */
export async function NewFromStudio({ products, categories }: Props) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  if (products.length === 0 && categories.length === 0) return null;
  const title = t("home.new.title");
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
      {products.length ? (
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
