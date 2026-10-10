"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { CatalogueCard } from "@/db/queries/catalogue";
import type { SlotDescriptor } from "@/lib/home-editor/context";
import { useLocale, useT } from "@/lib/i18n/client";
import { productImageUrl } from "@/lib/storage";
import type { SiteImageSlot } from "@/lib/validators/settings";
import { SiteImage } from "./site-image";
import { SlotOverlay } from "./slot-overlay";
import { Tag } from "./tag";

type Props = {
  products: CatalogueCard[];
  panel: SiteImageSlot | null;
  /** Editor-only: descriptors for the panel and the four tiles (translated on the server) */
  slots?: { panel: SlotDescriptor; tiles: SlotDescriptor[] };
};

/**
 * PW-09: the Papier-style split. The tall panel drifts up to 40px (parallax) and the four tiles
 * rise one after another when the section enters the viewport; both off under reduced motion.
 */
export function SignatureDesigns({ products, panel, slots }: Props) {
  const t = useT();
  const locale = useLocale();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], [40, -40]);

  if (products.length === 0 && !slots) return null;
  const tileCount = slots ? 4 : Math.min(products.length, 4);

  return (
    <section
      ref={ref}
      aria-labelledby="signature-heading"
      className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6 lg:py-10"
      data-testid="signature-designs"
    >
      <div className="flex flex-wrap gap-5">
        <div className="relative min-h-[360px] flex-[1_1_380px] overflow-hidden lg:min-h-[560px]">
          <motion.div
            style={reduced ? undefined : { y: drift }}
            className="absolute inset-x-0 -inset-y-10"
          >
            <SiteImage slot={panel} alt="" sizes="(min-width: 1024px) 40vw, 100vw" />
          </motion.div>
          <div className="from-scrim/80 via-scrim/45 relative flex h-full min-h-[360px] flex-col justify-end bg-gradient-to-t to-transparent p-8 text-white lg:min-h-[560px] lg:p-12">
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
        <ul className="grid flex-[1.4_1_560px] grid-cols-2 gap-4 lg:gap-5">
          {Array.from({ length: tileCount }, (_, i) => products[i] ?? null).map((product, i) => {
            const title = product
              ? locale === "bn" && product.titleBn
                ? product.titleBn
                : product.title
              : null;
            const tile = (
              <div className="bg-mist relative aspect-square overflow-hidden">
                {product?.thumb ? (
                  <Image
                    src={productImageUrl(product.thumb.thumbPath)}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
                {title ? <Tag className="absolute bottom-4 left-4 z-10">{title}</Tag> : null}
                {slots ? <SlotOverlay slots={[{ ...slots.tiles[i], filled: !!product }]} /> : null}
              </div>
            );
            return (
              <motion.li
                key={product?.id ?? `empty-${i}`}
                initial={reduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: reduced ? 0 : i * 0.12 }}
                className="group relative"
              >
                {slots ? (
                  tile
                ) : product ? (
                  <Link href={`/products/${product.slug}`} className="block">
                    {tile}
                  </Link>
                ) : null}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
