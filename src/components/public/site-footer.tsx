import { getT } from "@/lib/i18n";

export async function SiteFooter({ studioName, tagline }: { studioName: string; tagline: string }) {
  const t = await getT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm">
        {tagline ? <p>{tagline}</p> : null}
        <p>
          © {year} {studioName} · {t("public.footer.madeIn")}
        </p>
      </div>
    </footer>
  );
}
