"use client";
import { useRef } from "react";
import { useT } from "@/lib/i18n/client";
import type { SlotShape } from "@/lib/validators/home-editor";

type Focus = { x: number; y: number };
type Props = { src: string; shape: SlotShape; focus: Focus; onChange: (focus: Focus) => void };

const ASPECT: Record<SlotShape, string> = {
  wide: "aspect-[16/9]",
  tall: "aspect-[3/4]",
  square: "aspect-square",
};
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The crop preview: the photo fills the slot's shape and the owner pans it with a pointer drag or
 * the arrow keys. The pan is stored as the crop focus (object-position) with the slot.
 */
export function CropPreview({ src, shape, focus, onChange }: Props) {
  const t = useT();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; focus: Focus } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, y: e.clientY, focus };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || !frame.current) return;
    const { width, height } = frame.current.getBoundingClientRect();
    // Dragging the photo right shows more of its left side, so the focus moves left.
    onChange({
      x: clamp(drag.current.focus.x - (e.clientX - drag.current.x) / width),
      y: clamp(drag.current.focus.y - (e.clientY - drag.current.y) / height),
    });
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 0.05;
    const next = { ...focus };
    if (e.key === "ArrowLeft") next.x = clamp(focus.x - step);
    else if (e.key === "ArrowRight") next.x = clamp(focus.x + step);
    else if (e.key === "ArrowUp") next.y = clamp(focus.y - step);
    else if (e.key === "ArrowDown") next.y = clamp(focus.y + step);
    else return;
    e.preventDefault();
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div
        ref={frame}
        role="img"
        aria-label={t("admin.editor.panel.crop")}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`bg-mist focus-visible:outline-primary relative w-full max-w-md cursor-grab touch-none overflow-hidden outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing ${ASPECT[shape]}`}
        data-testid="crop-preview"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="size-full object-cover"
          style={{ objectPosition: `${Math.round(focus.x * 100)}% ${Math.round(focus.y * 100)}%` }}
        />
      </div>
      <p className="text-muted-foreground text-xs">{t("admin.editor.panel.crop")}</p>
    </div>
  );
}
