"use client";
import { PencilIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEditor, type SlotDescriptor } from "@/lib/home-editor/context";
import { useT } from "@/lib/i18n/client";

type Props = {
  /** One button per slot; the hero passes its video and poster */
  slots: SlotDescriptor[];
  /** "gallery" marks a section managed elsewhere (Happy customers) */
  managed?: "gallery";
  children: ReactNode;
  className?: string;
};

/**
 * Wraps a photo on the home page. For visitors it renders only its children (the editor context
 * is null, so nothing from the editor reaches the public bundle). In the editor, hover dims the
 * photo and shows the change button; on phones the pencil badge is always visible.
 */
export function SlotFrame({ slots, managed, children, className = "" }: Props) {
  const editor = useEditor();
  const t = useT();
  if (!editor) return <>{children}</>;

  return (
    <div className={`group/slot relative ${className}`} data-slot-frame={slots[0]?.id ?? managed}>
      {children}
      <div
        aria-hidden
        className="bg-ink/0 group-focus-within/slot:bg-ink/40 group-hover/slot:bg-ink/40 pointer-events-none absolute inset-0 transition-colors"
      />
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 opacity-100 lg:opacity-0 lg:group-focus-within/slot:opacity-100 lg:group-hover/slot:opacity-100">
        {managed ? (
          <a
            href="/admin/gallery"
            className="bg-paper text-ink rounded-full px-4 py-2 text-sm font-medium shadow"
            data-testid="slot-managed"
          >
            {t("admin.editor.managedInGallery")}
          </a>
        ) : (
          slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => editor.openSlot(slot)}
              aria-label={t("admin.editor.slotLabel", { slot: slot.label })}
              data-testid={`slot-${slot.id}`}
              className="bg-paper text-ink inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow hover:bg-white"
            >
              <PencilIcon className="size-4" aria-hidden />
              {slot.kind === "heroVideo"
                ? t("admin.editor.changeVideo")
                : slot.id === "heroPoster"
                  ? t("admin.editor.changePoster")
                  : t("admin.editor.changePhoto")}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
