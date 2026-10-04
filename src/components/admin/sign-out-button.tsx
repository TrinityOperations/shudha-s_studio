import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n";

export async function SignOutButton() {
  const t = await getT();
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        {t("common.signOut")}
      </Button>
    </form>
  );
}
