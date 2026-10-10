"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { recordHeroVideo, setHomeSlot } from "@/actions/home-editor";
import { createHeroVideoUpload as createUpload } from "@/actions/site-images";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { SITE_IMAGES_BUCKET } from "@/lib/home";
import { createClient } from "@/lib/supabase/client";
import { HERO_VIDEO_MAX_BYTES, HERO_VIDEO_TYPE } from "@/lib/validators/site-images";

type Props = { filled: boolean; onDone: (dirty: boolean) => void };

/**
 * The hero video: the browser uploads straight to Storage through a signed URL (Netlify caps
 * function bodies), then the server checks the object and records it in the draft.
 */
export function VideoTab({ filled, onDone }: Props) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== HERO_VIDEO_TYPE || file.size > HERO_VIDEO_MAX_BYTES) {
      setError("errors.videoInvalid");
      return;
    }
    setBusy(true);
    try {
      const target = await createUpload();
      if (!target.ok) return void setError(target.error);
      const { error: uploadError } = await createClient()
        .storage.from(SITE_IMAGES_BUCKET)
        .uploadToSignedUrl(target.data.path, target.data.token, file, {
          contentType: HERO_VIDEO_TYPE,
        });
      if (uploadError) return void setError("errors.uploadFailed");
      const result = await recordHeroVideo({ path: target.data.path });
      if (!result.ok) return void setError(result.error);
      toast.success(t("admin.editor.videoPlaced"));
      onDone(result.data.dirty);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const result = await setHomeSlot({ slot: "heroVideo", value: null, shownProductIds: [] });
      if (!result.ok) return void setError(result.error);
      toast.success(t("admin.editor.videoRemoved"));
      onDone(result.data.dirty);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("admin.editor.panel.videoHint")}</p>
      <input
        ref={input}
        id="editor-video"
        type="file"
        accept={HERO_VIDEO_TYPE}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void upload(file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? t("admin.editor.uploading") : t("admin.editor.changeVideo")}
        </Button>
        {filled ? (
          <Button type="button" variant="outline" disabled={busy} onClick={remove}>
            {t("admin.editor.removeVideo")}
          </Button>
        ) : null}
      </div>
      {error ? <FieldError>{t(error)}</FieldError> : null}
    </div>
  );
}
