import { SettingsNav } from "@/components/admin/content/settings-nav";
import { requireOwner } from "@/lib/auth";

/** Settings hub: the sub-navigation above every settings screen (slice #10). */
export default async function SettingsLayout({ children }: LayoutProps<"/admin/settings">) {
  await requireOwner();
  return (
    <div className="space-y-6">
      <SettingsNav />
      {children}
    </div>
  );
}
