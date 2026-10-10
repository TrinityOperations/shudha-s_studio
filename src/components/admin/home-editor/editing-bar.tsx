"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { discardHomeDraft, publishHome } from "@/actions/home-editor";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

type Props = { dirty: boolean; onChanged: (dirty: boolean) => void };

/** Save (draft → published), Discard (draft ← published) and Exit, across the top of the page. */
export function EditingBar({ dirty, onChanged }: Props) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [discardOpen, setDiscardOpen] = useState(false);

  return (
    <div
      role="region"
      aria-label={t("admin.editor.bar.title")}
      className="bg-ink sticky top-0 z-50 text-white"
      data-testid="editing-bar"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg">{t("admin.editor.bar.title")}</span>
          <Badge
            variant="outline"
            className="border-white/40 text-white"
            data-testid="editor-dirty"
          >
            {dirty ? t("admin.editor.bar.dirty") : t("admin.editor.bar.upToDate")}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!dirty || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await publishHome();
                if (!result.ok) return void toast.error(t(result.error));
                toast.success(t("admin.editor.bar.saved"));
                onChanged(false);
                router.refresh();
              })
            }
            className="text-ink hover:bg-paper bg-white"
          >
            {pending ? t("admin.editor.bar.saving") : t("admin.editor.bar.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || pending}
            onClick={() => setDiscardOpen(true)}
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {t("admin.editor.bar.discard")}
          </Button>
          <Link
            href="/admin/settings"
            className={`${buttonVariants({ variant: "ghost" })} text-white hover:bg-white/10 hover:text-white`}
          >
            {t("admin.editor.bar.exit")}
          </Link>
        </div>
      </div>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={t("admin.editor.bar.discardTitle")}
        description={t("admin.editor.bar.discardBody")}
        confirmLabel={t("admin.editor.bar.discardConfirm")}
        destructive
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await discardHomeDraft();
            setDiscardOpen(false);
            if (!result.ok) return void toast.error(t(result.error));
            toast.success(t("admin.editor.discarded"));
            onChanged(false);
            router.refresh();
          })
        }
      />
    </div>
  );
}
