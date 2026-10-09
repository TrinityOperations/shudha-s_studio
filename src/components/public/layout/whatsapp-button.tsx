import { getT } from "@/lib/i18n";
import { WhatsAppIcon } from "./whatsapp-icon";

/**
 * PW-47: fixed bottom-right on every public page. A pill with text from 640px, a round icon-only
 * button below; `main` gets bottom padding at phone width so it never covers content.
 */
export async function WhatsAppButton({ href }: { href: string }) {
  const t = await getT();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("home.whatsapp")}
      data-testid="whatsapp-button"
      className="border-line text-ink hover:bg-paper shadow-soft fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center gap-2 rounded-full border bg-white text-[15px] font-medium sm:h-12 sm:w-auto sm:px-5"
    >
      <WhatsAppIcon className="text-primary" />
      <span className="hidden sm:inline">{t("home.whatsapp")}</span>
    </a>
  );
}
