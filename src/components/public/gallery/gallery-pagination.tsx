import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n";

type Props = { page: number; pageCount: number };

export async function GalleryPagination({ page, pageCount }: Props) {
  const t = await getT();
  if (pageCount <= 1) return null;
  const href = (p: number) => (p === 1 ? "/gallery" : `/gallery?page=${p}`);
  return (
    <nav
      aria-label={t("gallery.page", { page, total: pageCount })}
      className="flex items-center justify-between gap-3"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonVariants({ variant: "outline" })}>
          {t("gallery.prevPage")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground text-sm">
        {t("gallery.page", { page, total: pageCount })}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className={buttonVariants({ variant: "outline" })}>
          {t("gallery.nextPage")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
