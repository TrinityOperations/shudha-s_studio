"use client";
import { useTransition } from "react";
import { setLocale } from "@/actions/locale";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n/client";

/** English ⇄ Bengali switch, persisted in a cookie (PW-80). */
export function LocaleToggle() {
  const t = useT();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const nextLocale = locale === "en" ? "bn" : "en";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      lang={nextLocale}
      className={nextLocale === "bn" ? "font-bangla" : undefined}
      aria-label={t("common.language")}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocale(nextLocale);
        })
      }
    >
      {t("locale.switchTo")}
    </Button>
  );
}
