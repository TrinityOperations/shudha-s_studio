"use client";
import { useEffect, useRef, useState } from "react";
import type {
  WizardAction,
  WizardPhoto,
  WizardState,
} from "@/components/public/wizard/wizard-state";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { prepareImageForUpload } from "@/lib/client-image";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/t";
import { REFERENCE_IMAGE_TYPES } from "@/lib/validators/booking";
import { MAX_WIZARD_PHOTOS, WIZARD_PHOTO_MAX_BYTES } from "@/lib/validators/brief";

type Props = { state: WizardState; dispatch: (action: WizardAction) => void };

/**
 * Step 5: photos are resized in the browser as they are chosen, so the final submit is small and
 * the thumbnails are the real files. Object URLs are revoked when a photo is removed or the
 * wizard unmounts.
 */
export function PhotosStep({ state, dispatch }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(false);
  const urls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const owned = urls.current;
    return () => {
      for (const url of owned) URL.revokeObjectURL(url);
    };
  }, []);

  const full = state.photos.length >= MAX_WIZARD_PHOTOS;

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const chosen = Array.from(list);
    if (inputRef.current) inputRef.current.value = "";
    setError(null);
    if (chosen.length > MAX_WIZARD_PHOTOS - state.photos.length) {
      setError("wizard.photos.tooMany");
      return;
    }
    setBusy(true);
    try {
      const photos: WizardPhoto[] = [];
      for (const file of chosen) {
        if (!(REFERENCE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
          setError("errors.imageType");
          return;
        }
        const prepared = await prepareImageForUpload(file);
        if (prepared.size > WIZARD_PHOTO_MAX_BYTES) {
          setError("wizard.photos.tooLarge");
          return;
        }
        const url = URL.createObjectURL(prepared);
        urls.current.add(url);
        photos.push({ id: crypto.randomUUID(), file: prepared, url });
      }
      dispatch({ type: "addPhotos", photos });
    } finally {
      setBusy(false);
    }
  }

  function remove(photo: WizardPhoto) {
    URL.revokeObjectURL(photo.url);
    urls.current.delete(photo.url);
    dispatch({ type: "removePhoto", id: photo.id });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{t("wizard.step5.title")}</h2>
        <p id="photos-hint" className="text-muted-foreground mt-1 text-sm">
          {t("wizard.step5.hint")}
        </p>
      </header>

      {state.photos.length ? (
        <ul className="flex flex-wrap gap-3" aria-label={t("wizard.summary.photos")}>
          {state.photos.map((photo, i) => (
            <li key={photo.id} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img
                src={photo.url}
                alt=""
                width={96}
                height={96}
                className="size-24 rounded-md border object-cover"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-24"
                onClick={() => remove(photo)}
                aria-label={t("wizard.step5.remove", { n: i + 1 })}
              >
                {t("common.delete")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <input
          ref={inputRef}
          id="photos"
          type="file"
          accept={REFERENCE_IMAGE_TYPES.join(",")}
          multiple
          className="sr-only"
          aria-describedby="photos-hint"
          disabled={full || busy}
          onChange={(e) => void onFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={full || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? t("common.working") : t("wizard.step5.add")}
        </Button>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {t("wizard.step5.count", { count: state.photos.length })}
        </p>
        {error ? <FieldError>{t(error)}</FieldError> : null}
      </div>
    </div>
  );
}
