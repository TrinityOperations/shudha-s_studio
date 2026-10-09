"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

export type AnnouncementMessage = { text: string; linkLabel: string; href: string };

const INTERVAL_MS = 6000;

/** OD-33: the strip above the header. Several messages cross-fade; paused on hover or focus. */
export function AnnouncementStrip({
  messages,
  label,
}: {
  messages: AnnouncementMessage[];
  label: string;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const rotating = messages.length > 1 && !paused;

  useEffect(() => {
    if (!rotating) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [rotating, messages.length]);

  const message = messages[index] ?? messages[0];
  if (!message) return null;

  return (
    <div
      role="region"
      aria-label={label}
      aria-live="polite"
      className="bg-paper border-line border-b text-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-testid="announcement-strip"
    >
      <div className="mx-auto flex min-h-10 w-full max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center">
        <span aria-hidden className="bg-mark size-2 shrink-0 rounded-full" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={index}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-ink"
          >
            {message.text}
            {message.href && message.linkLabel ? (
              <>
                {" "}
                <Link href={message.href} className="font-medium underline underline-offset-4">
                  {message.linkLabel}
                </Link>
              </>
            ) : null}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
