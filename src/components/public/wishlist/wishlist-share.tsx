"use client";
import { Share2Icon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { publicEnv } from "@/lib/env.public";
import { useT } from "@/lib/i18n/client";
import { whatsappShareLink } from "@/lib/whatsapp";
import { buildShareLink } from "@/lib/wishlist/share-link";

const subscribe = () => () => {};
const hasNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/** PW-62: the list as a link (slugs in the URL, nothing stored). Same pattern as the #3 share buttons. */
export function WishlistShare({ slugs }: { slugs: readonly string[] }) {
  const t = useT();
  const nativeShare = useSyncExternalStore(subscribe, hasNativeShare, () => false);
  const url = buildShareLink(publicEnv.siteUrl, slugs);
  const title = t("wishlist.share.title");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("wishlist.share.copied"));
    } catch {
      toast.error(t("wishlist.share.failed"));
    }
  }

  return (
    <section aria-labelledby="wishlist-share-heading" className="space-y-2">
      <h2 id="wishlist-share-heading" className="text-lg font-semibold">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm">{t("wishlist.share.hint")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {nativeShare ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigator.share({ title, url }).catch(() => undefined)}
          >
            <Share2Icon data-icon="inline-start" />
            {t("wishlist.share.native")}
          </Button>
        ) : (
          <>
            <a
              href={whatsappShareLink(`${title} ${url}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("wishlist.share.whatsapp")}
            </a>
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {t("wishlist.share.copy")}
            </Button>
          </>
        )}
      </div>
      <p className="text-muted-foreground text-xs break-all" data-testid="wishlist-share-url">
        {url}
      </p>
    </section>
  );
}
