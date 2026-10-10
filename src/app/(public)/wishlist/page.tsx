import type { Metadata } from "next";
import { SharedWishlist } from "@/components/public/wishlist/shared-wishlist";
import { WishlistList } from "@/components/public/wishlist/wishlist-list";
import { listPublishedProductsBySlugs } from "@/db/queries/catalogue";
import { getLocale, getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { parseShareItems, SHARE_PARAM } from "@/lib/wishlist/share-link";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return pageMetadata("/wishlist", locale, {
    title: t("wishlist.title"),
    description: t("wishlist.description"),
    robots: { index: false },
  });
}

/**
 * PW-60, PW-62: the visitor's own list (read from the browser after hydration) or, with
 * `?items=slug,slug`, a shared list resolved here against published products only.
 */
export default async function WishlistPage({ searchParams }: PageProps<"/wishlist">) {
  const params = await searchParams;
  const shared = parseShareItems(params[SHARE_PARAM]);
  const t = await getT();

  if (shared.length > 0) {
    const products = await listPublishedProductsBySlugs(shared);
    return (
      <section className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 lg:py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("wishlist.shared.title")}</h1>
        </header>
        <SharedWishlist products={products} />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 lg:py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("wishlist.title")}</h1>
        <p className="text-muted-foreground">{t("wishlist.intro")}</p>
      </header>
      <WishlistList />
    </section>
  );
}
