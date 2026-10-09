import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import type { SeasonalBannerSettings } from "@/lib/validators/settings";

/** Home section 7: one big accent tag; hidden until the owner turns it on (#10, colour in #13). */
export async function SeasonalBanner({ banner }: { banner: SeasonalBannerSettings }) {
  if (!banner.enabled) return null;
  const locale = localiseWith(await getLocale());
  const label = locale(banner.label, banner.labelBn);
  const headline = locale(banner.headline, banner.headlineBn);
  const button = locale(banner.buttonLabel, banner.buttonLabelBn);
  return (
    <section aria-label={label} className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
      <div className="bg-primary relative mx-auto max-w-[1040px] px-10 py-14 text-center text-white [clip-path:polygon(44px_0,100%_0,100%_100%,44px_100%,0_50%)] lg:px-[72px] lg:py-20 lg:pl-40 lg:[clip-path:polygon(80px_0,100%_0,100%_100%,80px_100%,0_50%)]">
        <span
          aria-hidden
          className="absolute top-1/2 left-5 hidden size-[26px] -translate-y-1/2 rounded-full border-[3px] border-white lg:left-10 lg:block"
        />
        <span
          aria-hidden
          className="bg-mark absolute top-1/2 left-14 hidden h-[1.5px] w-24 origin-left -translate-y-1/2 -rotate-[28deg] lg:block"
        />
        <p className="text-white/88">{label}</p>
        <h2 className="font-heading mx-auto mt-3 max-w-3xl text-[clamp(32px,3.6vw,48px)] leading-tight">
          {headline}
        </h2>
        <Link
          href={banner.href || "/book"}
          prefetch={false}
          className="text-ink hover:bg-paper mt-8 inline-flex min-h-11 items-center rounded-full bg-white px-[26px] py-[14px] text-[15px] font-medium"
        >
          {button}
        </Link>
      </div>
    </section>
  );
}

function localiseWith(locale: "en" | "bn") {
  return (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
}
