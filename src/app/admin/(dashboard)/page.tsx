import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.dashboard.title") };
}

export default async function AdminHomePage() {
  const owner = await requireOwner();
  const t = await getT();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.dashboard.title")}</h1>
      <p className="text-muted-foreground text-sm">
        {t("admin.dashboard.signedInAs", { email: owner.email ?? "" })}
      </p>
      <p className="max-w-prose">{t("admin.dashboard.intro")}</p>
      <Link href="/admin/settings" className={buttonVariants({ variant: "outline" })}>
        {t("common.settings")}
      </Link>
    </section>
  );
}
