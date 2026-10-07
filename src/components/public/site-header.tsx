import Link from "next/link";
import { LocaleToggle } from "@/components/shared/locale-toggle";
import { getT } from "@/lib/i18n";

export async function SiteHeader({ studioName }: { studioName: string }) {
  const t = await getT();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          {studioName}
        </Link>
        <nav aria-label={t("common.home")} className="flex items-center gap-2">
          <Link
            href="/products"
            className="px-2 py-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("common.products")}
          </Link>
          <LocaleToggle />
        </nav>
      </div>
    </header>
  );
}
