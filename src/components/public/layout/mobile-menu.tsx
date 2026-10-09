"use client";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LocaleToggle } from "@/components/shared/locale-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n/client";
import { NAV_LINKS } from "./nav-links";

/** Phone header menu: a full-height sheet with the nav, the language toggle and Book. */
export function MobileMenu({ studioName }: { studioName: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="size-11"
        aria-label={t("header.menu")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        data-testid="header-menu"
      >
        <MenuIcon aria-hidden />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-paper w-[min(100vw,360px)] p-6 sm:max-w-sm">
          <SheetTitle className="font-heading text-ink text-2xl">{studioName}</SheetTitle>
          <SheetDescription className="sr-only">{t("header.menu")}</SheetDescription>
          <nav aria-label={t("header.menu")} className="mt-6">
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-ink block py-3 text-lg font-medium"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-8 flex flex-col items-start gap-4">
            <LocaleToggle />
            <Link
              href="/book"
              prefetch={false}
              onClick={() => setOpen(false)}
              className={buttonVariants({ size: "lg" })}
            >
              {t("header.book")}
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
