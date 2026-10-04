import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { adminNextPathSchema } from "@/lib/validators/common";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.login.title"), robots: { index: false, follow: false } };
}

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  // proxy.ts already bounces a signed-in owner; this keeps the page correct on its own.
  if (await getOwner()) redirect("/admin");

  const t = await getT();
  const { next } = await searchParams;
  const safeNext = adminNextPathSchema.safeParse(next);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("admin.login.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.login.subtitle")}</p>
        </header>
        <LoginForm next={safeNext.success ? safeNext.data : undefined} />
      </section>
    </main>
  );
}
