"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import type { SlotDescriptor } from "@/lib/home-editor/context";
import { useT } from "@/lib/i18n/client";
import type { SiteImageSlot } from "@/lib/validators/settings";
import { SiteImage } from "./site-image";
import { SlotOverlay } from "./slot-overlay";

export type SignatureCard = {
  key: string;
  /** A ProductCard rendered on the server, or null for an empty editor slot */
  card: ReactNode | null;
};

type Props = {
  cards: SignatureCard[];
  panel: SiteImageSlot | null;
  /** Editor-only: descriptors for the panel and the four tiles (translated on the server) */
  slots?: { panel: SlotDescriptor; tiles: SlotDescriptor[] };
};

/** How far the panel photo drifts each way; the hidden margin (56px) always covers it. */
const DRIFT_PX = 48;

/**
 * PW-09: the Papier-style split. On desktop the tall panel pins below the collapsed header while
 * the two columns of product cards scroll past (position: sticky, no JavaScript); its photo
 * drifts a little (parallax) and the cards rise in one after another. Phones: panel first, not
 * sticky, then the cards. Motion is off under reduced motion.
 */
export function SignatureDesigns({ cards, panel, slots }: Props) {
  const t = useT();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], [DRIFT_PX, -DRIFT_PX]);

  if (cards.every((c) => c.card === null) && !slots) return null;

  return (
    <section
      ref={ref}
      aria-labelledby="signature-heading"
      className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6 lg:py-10"
      data-testid="signature-designs"
    >
      <div className="flex flex-wrap items-start gap-5">
        <div
          className="relative min-h-[360px] flex-[1_1_380px] overflow-hidden lg:sticky lg:top-[var(--header-collapsed-height)] lg:h-[clamp(480px,calc(100vh-var(--header-collapsed-height)-48px),720px)] lg:min-h-0"
          data-testid="signature-panel"
        >
          <motion.div
            style={reduced ? undefined : { y: drift }}
            className="absolute inset-x-0 -inset-y-14"
          >
            <SiteImage slot={panel} alt="" sizes="(min-width: 1024px) 40vw, 100vw" />
          </motion.div>
          {/* The scrim sits on the text's own container so contrast checks can see it. */}
          <div className="from-scrim/80 via-scrim/45 relative flex h-full min-h-[360px] flex-col justify-end bg-gradient-to-t to-transparent p-8 text-white lg:min-h-0 lg:p-12">
            <h2
              id="signature-heading"
              className="font-heading text-[32px] leading-tight lg:text-[44px]"
            >
              {t("home.signature.title")}
            </h2>
            <p className="mt-3 max-w-md text-white/90">{t("home.signature.intro")}</p>
            <Link
              href="/products?tag=signature"
              className="mt-5 w-fit text-[15px] font-medium underline underline-offset-[5px]"
            >
              {t("home.signature.link")}
            </Link>
          </div>
          {slots ? <SlotOverlay slots={[slots.panel]} /> : null}
        </div>
        <ul
          className="grid flex-[1.4_1_560px] grid-cols-2 gap-4 lg:gap-5"
          data-testid="signature-cards"
        >
          {cards.map(({ key, card }, i) => (
            <motion.li
              key={key}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : i * 0.12 }}
              className="relative"
            >
              {card ?? (
                <div
                  className="bg-mist border-line aspect-[4/5] border"
                  data-placeholder="signature-tile"
                />
              )}
              {slots ? (
                <SlotOverlay slots={[{ ...slots.tiles[i], filled: card !== null }]} />
              ) : null}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
