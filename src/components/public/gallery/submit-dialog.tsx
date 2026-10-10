"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";
import { SubmitForm } from "./submit-form";

/** "Share your photo": the form in a dialog, reachable by keyboard from the page's button. */
export function SubmitDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="lg" onClick={() => setOpen(true)} data-testid="gallery-share">
        {t("gallery.share")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-ink text-2xl">
              {t("gallery.form.title")}
            </DialogTitle>
            <DialogDescription>{t("gallery.form.photoHint")}</DialogDescription>
          </DialogHeader>
          <SubmitForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
