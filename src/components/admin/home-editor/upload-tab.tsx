"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { prepareImageForUpload } from "@/lib/client-image";
import type { SlotDescriptor } from "@/lib/home-editor/context";
import { useT } from "@/lib/i18n/client";
import { SITE_IMAGE_TYPES } from "@/lib/validators/site-images";
import { CropPreview } from "./crop-preview";

export type PreparedUpload = { file: File; url: string; focus: { x: number; y: number } };

type Props = {
  slot: SlotDescriptor;
  prepared: PreparedUpload | null;
  onPrepared: (upload: PreparedUpload | null) => void;
  /** Plain image slots: the owner says what the photo is. Product slots go straight to the form. */
  onJustPhoto: () => void;
  onNewProduct: () => void;
  busy: boolean;
};

/** "Upload": drop or pick a file, crop in the slot's shape, then say what it is. */
export function UploadTab({ slot, prepared, onPrepared, onJustPhoto, onNewProduct, busy }: Props) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    return () => {
      if (prepared) URL.revokeObjectURL(prepared.url);
    };
  }, [prepared]);

  async function take(file: File | undefined) {
    if (!file || !(SITE_IMAGE_TYPES as readonly string[]).includes(file.type)) return;
    const resized = await prepareImageForUpload(file);
    onPrepared({ file: resized, url: URL.createObjectURL(resized), focus: { x: 0.5, y: 0.5 } });
  }

  if (!prepared) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files[0]);
        }}
        className={`border-line flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center ${over ? "bg-mist" : ""}`}
      >
        <p className="text-muted-foreground text-sm">{t("admin.editor.panel.drop")}</p>
        <input
          ref={input}
          id="editor-upload"
          type="file"
          accept={SITE_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void take(file);
          }}
        />
        <Button type="button" variant="outline" onClick={() => input.current?.click()}>
          {t("admin.editor.panel.pick")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CropPreview
        src={prepared.url}
        shape={slot.shape}
        focus={prepared.focus}
        onChange={(focus) => onPrepared({ ...prepared, focus })}
      />
      {slot.kind === "product" ? (
        <Button type="button" onClick={onNewProduct} disabled={busy}>
          {t("admin.editor.panel.newProduct")}
        </Button>
      ) : (
        <fieldset className="space-y-3">
          <legend className="font-medium">{t("admin.editor.panel.whatIsIt")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onJustPhoto}
              disabled={busy}
              className="border-line hover:bg-mist rounded-lg border p-4 text-left"
              data-testid="choice-just-photo"
            >
              <span className="block font-medium">{t("admin.editor.panel.justPhoto")}</span>
              <span className="text-muted-foreground block text-sm">
                {t("admin.editor.panel.justPhotoHint")}
              </span>
            </button>
            <button
              type="button"
              onClick={onNewProduct}
              disabled={busy}
              className="border-line hover:bg-mist rounded-lg border p-4 text-left"
              data-testid="choice-new-product"
            >
              <span className="block font-medium">{t("admin.editor.panel.newProduct")}</span>
              <span className="text-muted-foreground block text-sm">
                {t("admin.editor.panel.newProductHint")}
              </span>
            </button>
          </div>
        </fieldset>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onPrepared(null)}
        disabled={busy}
      >
        {t("common.cancel")}
      </Button>
    </div>
  );
}
