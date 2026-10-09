import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n";
import type { AboutSettings, SiteImageSlot } from "@/lib/validators/settings";
import { SiteImage } from "./site-image";
import { HangingTag } from "./tag";

type Props = { portrait: SiteImageSlot | null; about: AboutSettings };

/** PW-05: her portrait with a hanging tag and her story (a [placeholder] until she sends it). */
export async function MeetShudha({ portrait, about }: Props) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const story =
    (locale === "bn" && about.storyBn ? about.storyBn : about.story) || t("home.meet.story");
  return (
    <section
      aria-labelledby="meet-heading"
      className="mx-auto w-full max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <div className="flex flex-wrap items-center gap-10 lg:gap-16">
        <div className="relative aspect-[4/5] w-full max-w-[400px] flex-[0_1_400px]">
          <SiteImage
            slot={portrait}
            alt=""
            sizes="(min-width: 1024px) 400px, 100vw"
            emptyLabel={t("home.placeholder.photo")}
          />
          <HangingTag>{t("home.meet.tag")}</HangingTag>
        </div>
        <div className="flex-[1_1_320px]">
          <h2
            id="meet-heading"
            className="font-heading text-ink text-[30px] leading-tight lg:text-[40px]"
          >
            {t("home.meet.title")}
          </h2>
          <p
            className="font-heading text-ink-soft mt-6 max-w-[600px] text-[20px] leading-relaxed lg:text-[22px]"
            data-placeholder={about.story ? undefined : "story"}
          >
            {story}
          </p>
          <p lang="bn" className="font-bangla text-mark mt-6 text-[28px]">
            {t("home.meet.signature")}
          </p>
          <Link
            href="/about"
            prefetch={false}
            className="text-ink mt-4 inline-block text-[15px] font-medium underline underline-offset-[5px]"
          >
            {t("home.meet.link")}
          </Link>
        </div>
      </div>
    </section>
  );
}
