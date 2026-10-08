"use client";
import { useEffect, useRef, useState } from "react";
import { getWishlistProducts } from "@/actions/wishlist";
import { localised } from "@/components/public/catalogue/localised";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { CatalogueCard } from "@/db/queries/catalogue";
import { useLocale, useT } from "@/lib/i18n/client";
import { ATTACHED_WISHLIST_MAX } from "@/lib/validators/wishlist";
import { useHydrated, useWishlist } from "@/lib/wishlist/use-wishlist";

export const WISHLIST_FIELD = "wishlistSlugs";

type Props = { attachByDefault: boolean };

/**
 * PW-61: "Attach my wishlist (n items)". Renders nothing until the browser list is known and
 * non-empty. When ticked, the slugs (never ids) go along as hidden `wishlistSlugs` fields; the
 * server resolves them against published products.
 */
export function WishlistAttach({ attachByDefault }: Props) {
  const t = useT();
  const locale = useLocale();
  const slugs = useWishlist();
  const hydrated = useHydrated();
  const [checked, setChecked] = useState(attachByDefault);
  const [products, setProducts] = useState<CatalogueCard[]>([]);
  const request = useRef(0);

  const attached = slugs.slice(0, ATTACHED_WISHLIST_MAX);
  const key = attached.join(",");

  useEffect(() => {
    if (!hydrated || !key) return;
    const id = ++request.current;
    getWishlistProducts(key.split(",")).then((result) => {
      if (id === request.current && result.ok) setProducts(result.data.products);
    });
  }, [hydrated, key]);

  if (!hydrated || attached.length === 0) return null;

  return (
    <Field orientation="horizontal" className="items-start" data-testid="wishlist-attach">
      <Checkbox
        id="attachWishlist"
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
        aria-describedby="attachWishlist-hint"
      />
      <div className="space-y-1">
        <FieldLabel htmlFor="attachWishlist" className="font-normal">
          {attached.length === 1
            ? t("wishlist.attach.labelOne")
            : t("wishlist.attach.label", { count: attached.length })}
        </FieldLabel>
        <FieldDescription id="attachWishlist-hint">{t("wishlist.attach.hint")}</FieldDescription>
        {checked ? (
          <>
            {products.length ? (
              <ul className="text-muted-foreground list-disc pl-5 text-sm">
                {products.map((product) => (
                  <li key={product.slug}>{localised(locale, product.title, product.titleBn)}</li>
                ))}
              </ul>
            ) : null}
            {attached.map((slug) => (
              <input key={slug} type="hidden" name={WISHLIST_FIELD} value={slug} />
            ))}
          </>
        ) : null}
      </div>
    </Field>
  );
}
