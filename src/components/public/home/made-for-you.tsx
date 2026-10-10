import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n";
import type { SiteImageSlot } from "@/lib/validators/settings";
import { SiteImage } from "./site-image";
import { SlotOverlay } from "./slot-overlay";

const STEPS = ["home.made.step1", "home.made.step2", "home.made.step3"] as const;

type Props = { photo: SiteImageSlot | null; editing?: boolean };

/** Home section 6: the custom order promise, the three wizard steps and the call to action. */
export async function MadeForYou({ photo, editing = false }: Props) {
  const t = await getT();
  return (
    <section
      id="made-for-you"
      aria-labelledby="made-heading"
      className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6 lg:py-10"
    >
      <div className="border-line flex flex-wrap border bg-white">
        <div
          className="relative min-h-[260px] flex-[1_1_400px] lg:min-h-[520px]"
          data-testid="made-for-you-photo"
        >
          <SiteImage
            slot={photo}
            alt=""
            sizes="(min-width: 1024px) 50vw, 100vw"
            emptyLabel={t("home.placeholder.photo")}
          />
          {editing ? (
            <SlotOverlay
              slots={[
                {
                  id: "madeForYou",
                  label: t("admin.editor.slots.madeForYou"),
                  shape: "wide",
                  kind: "image",
                  filled: !!photo,
                },
              ]}
            />
          ) : null}
        </div>
        <div className="flex flex-[1_1_400px] flex-col justify-center p-8 lg:p-14">
          <h2
            id="made-heading"
            className="font-heading text-ink text-[32px] leading-tight lg:text-[44px]"
          >
            {t("home.made.title")}
          </h2>
          <p className="text-ink-soft mt-4 max-w-prose text-[17px]">{t("home.made.intro")}</p>
          <ol className="mt-8 space-y-4">
            {STEPS.map((key, i) => (
              <li key={key} className="flex items-center gap-4">
                <span
                  aria-hidden
                  className="bg-mark grid size-[30px] shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                >
                  {i + 1}
                </span>
                <span className="text-ink">{t(key)}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/custom-order"
            prefetch={false}
            className={`${buttonVariants({ size: "lg" })} mt-10 w-fit`}
          >
            {t("home.made.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
