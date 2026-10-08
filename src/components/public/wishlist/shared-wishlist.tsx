"use client";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CatalogueCard } from "@/db/queries/catalogue";
import { useT } from "@/lib/i18n/client";
import { merge } from "@/lib/wishlist/storage";
import { WishlistTile } from "./wishlist-tile";

/** PW-62: a list someone shared, resolved on the server (published only), read-only. */
export function SharedWishlist({ products }: { products: CatalogueCard[] }) {
  const t = useT();

  if (products.length === 0) {
    return (
      <div className="space-y-4" data-testid="shared-wishlist-empty">
        <p className="text-muted-foreground">{t("wishlist.shared.empty")}</p>
        <Link href="/products" className={buttonVariants()}>
          {t("wishlist.browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="shared-wishlist">
      <p className="text-muted-foreground">
        {t("wishlist.shared.intro", { count: products.length })}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <li key={product.slug}>
            <WishlistTile product={product} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          onClick={() => {
            const added = merge(products.map((p) => p.slug));
            toast.success(t("wishlist.shared.saved", { count: added }));
          }}
        >
          {t("wishlist.shared.save")}
        </Button>
        <Link href="/wishlist" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t("wishlist.shared.mine")}
        </Link>
      </div>
    </div>
  );
}
