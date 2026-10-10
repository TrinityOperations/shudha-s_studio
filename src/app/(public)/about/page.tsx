import type { Metadata } from "next";
import Link from "next/link";
import { SiteImage } from "@/components/public/home/site-image";
import { HangingTag } from "@/components/public/home/tag";
import { PageShell } from "@/components/public/pages/page-shell";
import { Paragraphs } from "@/components/public/pages/paragraphs";
import { buttonVariants } from "@/components/ui/button";
import { getAboutSettings, getHomeSettings } from "@/db/queries/settings";
import { getLocale, getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("pages.about.title"),
    description: t("pages.about.description"),
    alternates: { canonical: "/about" },
  };
}

/** PW-40: her story (the `about` key) and portrait (the `home` key); a [placeholder] until she writes it. */
export default async function AboutPage() {
  const [t, locale, about, home] = await Promise.all([
    getT(),
    getLocale(),
    getAboutSettings(),
    getHomeSettings(),
  ]);
  const story =
    (locale === "bn" && about.storyBn ? about.storyBn : about.story) || t("home.meet.story");
  return (
    <PageShell title={t("pages.about.title")} wide>
      <div className="flex flex-wrap items-start gap-10 lg:gap-16">
        <div className="relative aspect-[4/5] w-full max-w-[400px] flex-[0_1_400px]">
          <SiteImage
            slot={home.portrait}
            alt=""
            sizes="(min-width: 1024px) 400px, 100vw"
            emptyLabel={t("home.placeholder.photo")}
          />
          <HangingTag>{t("home.meet.tag")}</HangingTag>
        </div>
        <div className="flex-[1_1_320px] space-y-6">
          <Paragraphs
            text={story}
            className="font-heading text-[20px] leading-relaxed lg:text-[22px]"
          />
          <p lang="bn" className="font-bangla text-mark text-[28px]">
            {t("home.meet.signature")}
          </p>
          <ul className="space-y-2">
            <li className="tag tag-quiet">{t("pages.about.handmade")}</li>
            <li className="tag tag-quiet">{t("pages.about.heritage")}</li>
          </ul>
          <Link href="/custom-order" prefetch={false} className={buttonVariants({ size: "lg" })}>
            {t("pages.about.cta")}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
