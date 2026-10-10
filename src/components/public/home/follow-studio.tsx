import { FacebookIcon, InstagramIcon } from "@/components/public/layout/social-icons";
import { buttonVariants } from "@/components/ui/button";
import { collageSlots } from "@/lib/home";
import { getT } from "@/lib/i18n";
import type { HomeContent, SocialSettings } from "@/lib/validators/settings";
import { SectionHeading } from "./section-heading";
import { SiteImage } from "./site-image";
import { SlotFrame } from "./slot-frame";

type Props = { collage: HomeContent["collage"]; social: SocialSettings; editing?: boolean };

/**
 * PW-07: the collage (docs/design.md, section 11). Ten slots on desktop (6 columns, 190px rows),
 * the first seven on phones (3 columns, 116px rows). Each entry: phone area, desktop area, and the
 * round or pill shape per breakpoint (phone slot 3 is round; desktop slot 5 is round, slot 9 a pill).
 */
const SLOTS: { phone: string | null; desktop: string; shape?: string }[] = [
  { phone: "[grid-area:1/1/3/3]", desktop: "lg:[grid-area:1/1/3/3]" },
  { phone: "[grid-area:1/3/2/4]", desktop: "lg:[grid-area:1/3/2/5]" },
  {
    phone: "[grid-area:2/3/3/4]",
    desktop: "lg:[grid-area:1/5/2/6]",
    shape: "rounded-full lg:rounded-none",
  },
  { phone: "[grid-area:3/1/4/2]", desktop: "lg:[grid-area:1/6/3/7]" },
  { phone: "[grid-area:3/2/4/4]", desktop: "lg:[grid-area:2/3/3/4]", shape: "lg:rounded-full" },
  { phone: "[grid-area:4/1/5/3]", desktop: "lg:[grid-area:2/4/3/6]" },
  { phone: "[grid-area:4/3/5/4]", desktop: "lg:[grid-area:3/1/4/2]" },
  { phone: null, desktop: "lg:[grid-area:3/2/4/4]" },
  { phone: null, desktop: "lg:[grid-area:3/4/4/5]", shape: "lg:rounded-full" },
  { phone: null, desktop: "lg:[grid-area:3/5/4/7]" },
];

export async function FollowStudio({ collage, social, editing = false }: Props) {
  const t = await getT();
  const slots = collageSlots(collage, SLOTS.length);
  return (
    <section
      aria-labelledby="follow-heading"
      className="mx-auto w-full max-w-7xl px-4 py-14 lg:px-6 lg:py-20"
    >
      <SectionHeading
        id="follow-heading"
        title={t("home.follow.title")}
        className="mb-8"
        action={
          <>
            {social.instagram ? (
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <InstagramIcon data-icon="inline-start" />
                {t("home.follow.instagram")}
              </a>
            ) : null}
            {social.facebook ? (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <FacebookIcon data-icon="inline-start" />
                {t("home.follow.facebook")}
              </a>
            ) : null}
          </>
        }
      />
      <ul
        className="grid auto-rows-[116px] grid-cols-3 gap-2 lg:auto-rows-[190px] lg:grid-cols-6 lg:gap-4"
        data-testid="collage"
      >
        {slots.map((slot, i) => (
          <li
            key={i}
            className={`group relative overflow-hidden ${SLOTS[i].phone ?? "hidden lg:block"} ${SLOTS[i].desktop} ${SLOTS[i].shape ?? ""}`}
          >
            <SlotFrame
              slots={
                editing
                  ? [
                      {
                        id: `collage.${i}`,
                        label: t("admin.editor.slots.collage", { n: i + 1 }),
                        shape: "wide",
                        kind: "image",
                        filled: !!slot,
                      },
                    ]
                  : []
              }
              className="absolute inset-0"
            >
              <SiteImage
                slot={slot}
                alt=""
                sizes="(min-width: 1024px) 33vw, 66vw"
                className="transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </SlotFrame>
          </li>
        ))}
      </ul>
    </section>
  );
}
