"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  /** A count beside the label (the gallery's pending photos) with its accessible wording */
  badge?: { count: number; label: string };
};

export function AdminNavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-wrap items-center gap-1 md:flex-col md:items-stretch">
      {links.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "hover:bg-muted block rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-muted font-medium" : "text-muted-foreground",
              )}
            >
              {link.label}
              {link.badge ? (
                <span
                  className="bg-mark ml-2 inline-block min-w-[18px] rounded-full px-1.5 text-center text-[11px] leading-[18px] font-semibold text-white"
                  aria-label={link.badge.label}
                  data-testid="gallery-badge"
                >
                  {link.badge.count}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
