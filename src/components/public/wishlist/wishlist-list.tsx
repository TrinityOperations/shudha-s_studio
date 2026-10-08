"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getWishlistProducts } from "@/actions/wishlist";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CatalogueCard } from "@/db/queries/catalogue";
import { useT } from "@/lib/i18n/client";
import { clear, isPersistent, prune, remove } from "@/lib/wishlist/storage";
import { useHydrated, useWishlist } from "@/lib/wishlist/use-wishlist";
import { WishlistShare } from "./wishlist-share";
import { WishlistTile } from "./wishlist-tile";

/**
 * PW-60: the visitor's own list. Slugs come from the browser after hydration; the server returns
 * the published products behind them and anything missing is pruned from storage with one toast.
 */
const noop = () => () => {};

export function WishlistList() {
  const t = useT();
  const slugs = useWishlist();
  const hydrated = useHydrated();
  // Whether localStorage works is fixed after the first probe, so it reads like external state.
  const persistent = useSyncExternalStore(noop, isPersistent, () => true);
  const [known, setKnown] = useState<ReadonlyMap<string, CatalogueCard>>(() => new Map());
  const [clearOpen, setClearOpen] = useState(false);
  const inFlight = useRef<string | null>(null);

  const unknown = slugs.filter((slug) => !known.has(slug));
  const products = hydrated && unknown.length === 0 ? slugs.map((slug) => known.get(slug)!) : null;

  useEffect(() => {
    if (!hydrated || unknown.length === 0) return;
    const key = unknown.join(",");
    if (inFlight.current === key) return;
    inFlight.current = key;
    getWishlistProducts(unknown).then((result) => {
      if (inFlight.current !== key) return;
      inFlight.current = null;
      const found = result.ok ? result.data.products : [];
      setKnown((previous) => {
        const next = new Map(previous);
        for (const product of found) next.set(product.slug, product);
        return next;
      });
      const foundSlugs = new Set(found.map((product) => product.slug));
      if (unknown.some((slug) => !foundSlugs.has(slug))) {
        prune(slugs.filter((slug) => known.has(slug) || foundSlugs.has(slug)));
        toast.info(t("wishlist.unavailable"));
      }
    });
  }, [hydrated, unknown, slugs, known, t]);

  if (!hydrated || products === null) {
    return (
      <p className="text-muted-foreground" aria-live="polite">
        {t("common.working")}
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <div className="space-y-4" data-testid="wishlist-empty">
        <p className="text-muted-foreground">{t("wishlist.empty")}</p>
        <Link href="/products" className={buttonVariants()}>
          {t("wishlist.browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!persistent ? (
        <p role="note" className="rounded-md border px-3 py-2 text-sm">
          {t("wishlist.notPersistent")}
        </p>
      ) : null}
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {products.length === 1
          ? t("wishlist.countOne")
          : t("wishlist.count", { count: products.length })}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <li key={product.slug}>
            <WishlistTile product={product} onRemove={() => remove(product.slug)} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Link href="/book?wishlist=1" prefetch={false} className={buttonVariants({ size: "lg" })}>
          {t("wishlist.book")}
        </Link>
        <Button type="button" variant="outline" size="lg" onClick={() => setClearOpen(true)}>
          {t("wishlist.clear")}
        </Button>
      </div>
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title={t("wishlist.clearTitle")}
        description={
          products.length === 1
            ? t("wishlist.clearBodyOne")
            : t("wishlist.clearBody", { count: products.length })
        }
        confirmLabel={t("wishlist.clearConfirm")}
        destructive
        onConfirm={() => {
          clear();
          setClearOpen(false);
        }}
      />
      <WishlistShare slugs={slugs} />
    </div>
  );
}
