"use client";
import { useT } from "@/lib/i18n/client";

/** OD-36: marks a Bengali input's label; sits inside the FieldLabel after the English text. */
export function BanglaBadge() {
  const t = useT();
  return (
    <span
      lang="bn"
      className="font-bangla bg-mist text-ink ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-normal"
    >
      {t("common.banglaBadge")}
    </span>
  );
}
