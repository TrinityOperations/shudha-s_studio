"use client";
import { useEffect, useState, type ReactNode } from "react";

export const HERO_SENTINEL = "data-hero-sentinel";

/**
 * Sticky header shell. One IntersectionObserver on the hero (it carries the sentinel attribute)
 * collapses the bar once the hero has scrolled out from under the header; pages without a hero
 * never collapse. The name fade and padding change are CSS transitions, so reduced motion makes
 * them instant through globals.css.
 */
export function HeaderChrome({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const sentinel = document.querySelector(`[${HERO_SENTINEL}]`);
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      data-collapsed={collapsed}
      data-testid="site-header"
      className="group/header bg-paper border-line sticky top-0 z-40 border-b transition-[padding] duration-300 data-[collapsed=false]:py-[18px] data-[collapsed=true]:py-2.5"
    >
      {children}
    </header>
  );
}
