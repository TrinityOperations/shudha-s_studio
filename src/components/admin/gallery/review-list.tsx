"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  approveGallerySubmission,
  deleteGallerySubmission,
  hideGallerySubmission,
} from "@/actions/gallery";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";

export type ReviewCard = {
  id: string;
  status: "pending" | "approved" | "hidden";
  firstName: string | null;
  note: string | null;
  /** Already formatted on the server */
  received: string;
  /** Thumbnail URL: public for approved, a short-lived signed URL otherwise; null when missing */
  thumbUrl: string | null;
  /** Full-size URL, same rule */
  fullUrl: string | null;
};

type ActionResultLike = { ok: true } | { ok: false; error: MessageKey };

/** OD-32: one card per photo with big Approve / Hide / Delete buttons; Delete asks first. */
export function ReviewList({ cards }: { cards: ReviewCard[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<ReviewCard | null>(null);

  function run(action: () => Promise<ActionResultLike>, successKey: MessageKey) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(t(result.error));
      toast.success(t(successKey));
      router.refresh();
    });
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="review-list">
        {cards.map((card) => (
          <li
            key={card.id}
            className="flex flex-col gap-3 rounded-lg border p-3"
            data-testid="review-card"
          >
            <a
              href={card.fullUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-muted relative block aspect-[3/4] overflow-hidden rounded-md"
              aria-label={t("admin.gallery.open")}
            >
              {card.thumbUrl ? (
                <Image
                  src={card.thumbUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover"
                />
              ) : null}
            </a>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{card.firstName || t("admin.gallery.noName")}</p>
              {card.note ? <p className="text-muted-foreground">{card.note}</p> : null}
              <p className="text-muted-foreground text-xs">
                {t("admin.gallery.received", { date: card.received })}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {card.status !== "approved" ? (
                <Button
                  type="button"
                  className="min-h-11 flex-1"
                  disabled={pending}
                  onClick={() =>
                    run(() => approveGallerySubmission(card.id), "admin.gallery.approved")
                  }
                >
                  {t("admin.gallery.approve")}
                </Button>
              ) : null}
              {card.status !== "hidden" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 flex-1"
                  disabled={pending}
                  onClick={() => run(() => hideGallerySubmission(card.id), "admin.gallery.hidden")}
                >
                  {t("admin.gallery.hide")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className={`${buttonVariants({ variant: "outline" })} min-h-11 flex-1`}
                disabled={pending}
                onClick={() => setDeleting(card)}
              >
                {t("admin.gallery.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("admin.gallery.deleteTitle")}
        description={t("admin.gallery.deleteBody")}
        confirmLabel={t("admin.gallery.delete")}
        destructive
        pending={pending}
        onConfirm={() => {
          const card = deleting;
          setDeleting(null);
          if (card) run(() => deleteGallerySubmission(card.id), "admin.gallery.deleted");
        }}
      />
    </>
  );
}
