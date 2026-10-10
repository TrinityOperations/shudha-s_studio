import { permanentRedirect } from "next/navigation";

/** PW-48: the delivery note lives on How it works. */
export default function DeliveryPage() {
  permanentRedirect("/how-it-works#delivery");
}
