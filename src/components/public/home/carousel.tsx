"use client";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import { SectionHeading } from "./section-heading";

type Props = {
  label: string;
  children: ReactNode;
  /** Section heading rendered above the row, with `action` and the controls on its right */
  title?: string;
  headingId?: string;
  action?: ReactNode;
  showControls?: boolean;
  className?: string;
};

/**
 * Snap-scrolling row with hidden scrollbar; swipe on phones, 44px round controls elsewhere.
 * Items are `li` children sized by the caller (min-width).
 */
export function Carousel({
  label,
  children,
  title,
  headingId,
  action,
  showControls = false,
  className = "",
}: Props) {
  const t = useT();
  const ref = useRef<HTMLUListElement>(null);

  function scrollBy(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const buttons = (
    <>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label={t("home.carousel.prev")}
        className="border-line text-ink hover:bg-mist grid size-11 place-items-center rounded-full border bg-white"
      >
        <ChevronLeftIcon aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label={t("home.carousel.next")}
        className="border-line text-ink hover:bg-mist grid size-11 place-items-center rounded-full border bg-white"
      >
        <ChevronRightIcon aria-hidden />
      </button>
    </>
  );

  return (
    <div className={className}>
      {title ? (
        <SectionHeading
          id={headingId}
          title={title}
          className="mb-6"
          action={
            action || showControls ? (
              <>
                {action}
                {showControls ? buttons : null}
              </>
            ) : undefined
          }
        />
      ) : null}
      <ul
        ref={ref}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto px-4 pb-2 lg:-mx-0 lg:gap-6 lg:px-0"
      >
        {children}
      </ul>
    </div>
  );
}
