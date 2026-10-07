"use client";
import { Share2Icon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { whatsappShareLink } from "@/lib/whatsapp";

type Props = { url: string; title: string };

const subscribe = () => () => {};
const hasNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

export function facebookShareLink(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** PW-26: Web Share API where it exists (phones), otherwise WhatsApp, Facebook and copy link. */
export function ShareButtons({ url, title }: Props) {
  const t = useT();
  const nativeShare = useSyncExternalStore(subscribe, hasNativeShare, () => false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("catalogue.product.shareCopied"));
    } catch {
      toast.error(t("catalogue.product.shareFailed"));
    }
  }

  return (
    <section
      aria-label={t("catalogue.product.share")}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-muted-foreground text-sm">{t("catalogue.product.share")}</span>
      {nativeShare ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigator.share({ title, url }).catch(() => undefined)}
        >
          <Share2Icon data-icon="inline-start" />
          {t("catalogue.product.share")}
        </Button>
      ) : (
        <>
          <a
            href={whatsappShareLink(`${title} ${url}`)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("catalogue.product.shareWhatsApp")}
          </a>
          <a
            href={facebookShareLink(url)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("catalogue.product.shareFacebook")}
          </a>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {t("catalogue.product.shareCopy")}
          </Button>
        </>
      )}
    </section>
  );
}
