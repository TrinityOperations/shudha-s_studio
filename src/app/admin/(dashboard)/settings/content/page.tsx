import type { Metadata } from "next";
import { ContentForm } from "@/components/admin/content/content-form";
import {
  getAboutSettings,
  getContactSettings,
  getDeliverySettings,
  getLegalSettings,
  getSocialSettings,
} from "@/db/queries/settings";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("admin.content.title") };
}

export default async function ContentSettingsPage() {
  await requireOwner();
  const [t, about, delivery, social, contact, legal] = await Promise.all([
    getT(),
    getAboutSettings(),
    getDeliverySettings(),
    getSocialSettings(),
    getContactSettings(),
    getLegalSettings(),
  ]);
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.content.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.content.description")}</p>
      </header>
      <ContentForm
        defaultValues={{
          story: about.story,
          storyBn: about.storyBn,
          deliveryNote: delivery.note,
          deliveryNoteBn: delivery.noteBn,
          instagram: social.instagram,
          facebook: social.facebook,
          whatsappNumber: contact.whatsappNumber,
          email: contact.email,
          privacy: legal.privacy,
          privacyBn: legal.privacyBn,
          terms: legal.terms,
          termsBn: legal.termsBn,
        }}
      />
    </section>
  );
}
