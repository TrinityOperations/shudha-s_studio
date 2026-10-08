import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n";
import { buildReplyLinks, type ReplyInput } from "./reply-message";

/** OD-24: one-tap WhatsApp and email replies with a prefilled greeting in the customer's language. */
export async function ReplyLinks(props: ReplyInput) {
  const t = await getT();
  const links = buildReplyLinks(props);
  return (
    <div className="flex flex-wrap gap-2">
      {links.whatsapp ? (
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants()}
        >
          {t("admin.bookings.reply.whatsapp")}
        </a>
      ) : null}
      <a
        href={links.mailto}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline" })}
      >
        {t("admin.bookings.reply.email")}
      </a>
    </div>
  );
}
