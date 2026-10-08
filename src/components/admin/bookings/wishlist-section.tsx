import Image from "next/image";
import Link from "next/link";
import type { AdminProductRef } from "@/db/queries/bookings";
import { getT } from "@/lib/i18n";
import { productImageUrl } from "@/lib/storage";

/** OD-26: the products the customer attached from their wishlist (#8 fills this). */
export async function WishlistSection({ products }: { products: AdminProductRef[] }) {
  const t = await getT();
  return (
    <section className="space-y-3" aria-labelledby="wishlist-heading">
      <h2 id="wishlist-heading" className="text-lg font-semibold">
        {t("admin.bookings.detail.wishlist")}
      </h2>
      {products.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("admin.bookings.detail.noWishlist")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/products/${product.id}`}
                className="block space-y-1 underline-offset-4 hover:underline"
              >
                {product.thumbPath ? (
                  <Image
                    src={productImageUrl(product.thumbPath)}
                    alt=""
                    width={200}
                    height={200}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="bg-muted aspect-square w-full rounded-md" />
                )}
                <span className="text-sm">{product.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
