import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { countPendingGallery } from "@/db/queries/gallery";
import { getT } from "@/lib/i18n";

export async function AdminNav({ email }: { email: string }) {
  const [t, pendingGallery] = await Promise.all([getT(), countPendingGallery()]);
  const links = [
    { href: "/admin", label: t("common.dashboard") },
    { href: "/admin/products", label: t("common.products") },
    { href: "/admin/bookings", label: t("common.bookings") },
    { href: "/admin/availability", label: t("common.availability") },
    {
      href: "/admin/gallery",
      label: t("common.gallery"),
      badge: pendingGallery
        ? {
            count: pendingGallery,
            label:
              pendingGallery === 1
                ? t("admin.gallery.badgeOne")
                : t("admin.gallery.badge", { count: pendingGallery }),
          }
        : undefined,
    },
    { href: "/admin/settings", label: t("common.settings") },
  ];

  return (
    <aside className="border-b md:w-56 md:border-r md:border-b-0">
      <nav
        aria-label={t("admin.nav.label")}
        className="flex flex-wrap items-center gap-2 px-4 py-3 md:flex-col md:items-stretch md:gap-1 md:py-6"
      >
        <AdminNavLinks links={links} />
        <div className="ml-auto flex items-center gap-2 md:mt-auto md:ml-0 md:flex-col md:items-stretch md:pt-6">
          <span className="text-muted-foreground hidden truncate text-xs md:block" title={email}>
            {email}
          </span>
          <SignOutButton />
        </div>
      </nav>
    </aside>
  );
}
