import { AdminNav } from "@/components/admin/admin-nav";
import { requireOwner } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

// Every page under here must call requireOwner() too (pages re-render independently of layouts).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const owner = await requireOwner();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AdminNav email={owner.email ?? ""} />
      <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
