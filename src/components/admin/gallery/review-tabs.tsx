"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

const TABS: { value: "pending" | "approved" | "hidden"; key: MessageKey }[] = [
  { value: "pending", key: "admin.gallery.tab.pending" },
  { value: "approved", key: "admin.gallery.tab.approved" },
  { value: "hidden", key: "admin.gallery.tab.hidden" },
];

export function ReviewTabs({
  counts,
}: {
  counts: Record<"pending" | "approved" | "hidden", number>;
}) {
  const t = useT();
  const pathname = usePathname();
  const current = useSearchParams().get("tab") ?? "pending";
  return (
    <nav aria-label={t("admin.gallery.tabs")}>
      <ul className="flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <li key={tab.value}>
            <Link
              href={tab.value === "pending" ? pathname : `${pathname}?tab=${tab.value}`}
              aria-current={current === tab.value ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm",
                current === tab.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-line hover:bg-muted",
              )}
            >
              {t(tab.key)}
              <span className="rounded-full bg-white/20 px-1.5 text-xs">{counts[tab.value]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
