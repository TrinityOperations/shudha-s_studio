import type { Metadata } from "next";
import { EditorProvider } from "@/components/admin/home-editor/editor-provider";
import { HomeSections } from "@/components/public/home/home-sections";
import { getHomeSettingsFull } from "@/db/queries/settings";
import { listTaxonomy } from "@/db/queries/taxonomy";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.editor.bar.title"), robots: { index: false, follow: false } };
}

/**
 * The home page editor (docs/design.md, "Home page editor"): the real home sections rendered
 * from the draft copy, inside the editor context, under /admin (owner only) and outside the
 * dashboard layout so the page looks like the site.
 */
export default async function HomeEditorPage() {
  await requireOwner();
  const [home, taxonomy] = await Promise.all([getHomeSettingsFull(), listTaxonomy()]);
  const dirty = JSON.stringify(home.draft) !== JSON.stringify(home.published);
  return (
    <EditorProvider initialDirty={dirty} taxonomy={taxonomy}>
      <main id="main" className="flex-1">
        <HomeSections home={home.draft} editing />
      </main>
    </EditorProvider>
  );
}
