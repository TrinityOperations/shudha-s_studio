"use client";

import { CheckIcon, CopyIcon, MessageCircleIcon } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("catalogue.shareLabel")}>
      <a
        href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "outline" })}
      >
        <MessageCircleIcon aria-hidden="true" />
        {t("catalogue.shareWhatsApp")}
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "outline" })}
      >
        {t("catalogue.shareFacebook")}
      </a>
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        {copied ? t("catalogue.linkCopied") : t("catalogue.copyLink")}
      </Button>
    </div>
  );
}
