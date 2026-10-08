"use client";
import { HeartIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { toggle, WISHLIST_MAX } from "@/lib/wishlist/storage";
import { useWishlist } from "@/lib/wishlist/use-wishlist";

type Props = {
  slug: string;
  title: string;
  /** "icon" for the card corner (text visually hidden), "full" for the product page. */
  variant?: "icon" | "full";
};

/**
 * PW-60: the heart. A real button with aria-pressed and a text label, so it reads as
 * "Save, pressed" and never navigates: it sits above the card's link overlay.
 */
export function WishlistButton({ slug, title, variant = "icon" }: Props) {
  const t = useT();
  const saved = useWishlist().includes(slug);
  const label = saved ? t("wishlist.saved") : t("wishlist.save");

  function onClick() {
    const wasSaved = saved;
    const nowSaved = toggle(slug);
    if (nowSaved && !wasSaved) toast.success(t("wishlist.added", { title }));
    else if (!nowSaved && !wasSaved) toast.error(t("wishlist.full", { max: WISHLIST_MAX }));
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={variant === "icon" ? "icon" : "sm"}
      aria-pressed={saved}
      aria-label={variant === "icon" ? `${label}: ${title}` : undefined}
      onClick={onClick}
      className={
        variant === "icon"
          ? "bg-background/90 relative z-10 rounded-full shadow-sm backdrop-blur"
          : "relative z-10"
      }
      data-testid="wishlist-button"
    >
      <HeartIcon
        data-icon={variant === "icon" ? undefined : "inline-start"}
        className={saved ? "fill-current" : undefined}
        aria-hidden
      />
      {variant === "icon" ? <span className="sr-only">{label}</span> : label}
    </Button>
  );
}
