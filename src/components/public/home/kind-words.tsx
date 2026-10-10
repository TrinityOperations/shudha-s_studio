import type { Testimonial } from "@/db/schema";
import { getLocale, getT } from "@/lib/i18n";
import { localised } from "@/lib/i18n/localised";
import { SectionHeading } from "./section-heading";
import { Tag } from "./tag";

/** PW-06: three quotes on white cards; hidden until the owner adds testimonials (#10). */
export async function KindWords({ testimonials }: { testimonials: Testimonial[] }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  if (testimonials.length === 0) return null;
  return (
    <section
      aria-labelledby="kind-heading"
      className="mx-auto w-full max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <SectionHeading id="kind-heading" title={t("home.kind.title")} className="mb-8" />
      <ul className="grid gap-5 md:grid-cols-3">
        {testimonials.map((item) => (
          <li
            key={item.id}
            className="border-line flex flex-col justify-between gap-6 border bg-white p-7"
          >
            <blockquote className="font-heading text-ink text-[21px] leading-snug">
              {localised(locale, item.quote, item.quoteBn)}
            </blockquote>
            <Tag variant="credit" className="w-fit">
              {item.authorName}
            </Tag>
          </li>
        ))}
      </ul>
    </section>
  );
}
