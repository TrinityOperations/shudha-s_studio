"use client";
import { PencilIcon } from "lucide-react";
import { useEditor, type SlotDescriptor } from "@/lib/home-editor/context";
import { useT } from "@/lib/i18n/client";

type Props = {
  /** One button per slot; the hero passes its video and poster */
  slots: SlotDescriptor[];
};

/**
 * The editor's overlay for one photo slot: an `absolute inset-0` sibling of the photo inside the
 * slot's own positioned box, so the box keeps its classes, aspect ratio and grid placement. It
 * renders nothing for visitors (no editor context). Hover or focus dims the photo and shows the
 * change button; on phones the button is always visible.
 */
export function SlotOverlay({ slots }: Props) {
  const editor = useEditor();
  const t = useT();
  if (!editor || slots.length === 0) return null;

  return (
    <div
      className="group/slot hover:bg-ink/40 focus-within:bg-ink/40 absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 transition-colors"
      data-slot-overlay={slots[0].id}
    >
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          onClick={() => editor.openSlot(slot)}
          aria-label={t("admin.editor.slotLabel", { slot: slot.label })}
          data-testid={`slot-${slot.id}`}
          className="bg-paper text-ink inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow transition-opacity hover:bg-white lg:opacity-0 lg:group-focus-within/slot:opacity-100 lg:group-hover/slot:opacity-100"
        >
          <PencilIcon className="size-4" aria-hidden />
          {slot.kind === "heroVideo"
            ? t("admin.editor.changeVideo")
            : slot.id === "heroPoster"
              ? t("admin.editor.changePoster")
              : t("admin.editor.changePhoto")}
        </button>
      ))}
    </div>
  );
}
