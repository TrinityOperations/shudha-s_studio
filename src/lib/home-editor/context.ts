"use client";
import { createContext, useContext } from "react";
import type { SlotShape } from "@/lib/validators/home-editor";

/**
 * What a photo slot on the home page tells the editor about itself. Only the editor route
 * provides this context; for visitors it is null and SlotFrame renders nothing extra.
 */
export type SlotDescriptor = {
  /** "portrait", "collage.3", "occasion.eid", "signature.0", "new.5", "heroVideo", "heroPoster"… */
  id: string;
  /** Translated, for the button's accessible name */
  label: string;
  shape: SlotShape;
  /** Product slots hold a product; image slots hold a photo; the hero video is its own thing */
  kind: "image" | "product" | "heroVideo";
  /** Image slots that may also point at a product (occasion tiles) */
  acceptsProduct?: boolean;
  /** Whether something is in the slot now (shows Remove) */
  filled: boolean;
  /** For product slots: the products currently shown, so the fallback order can be frozen */
  shownProductIds?: string[];
  /** Signature tiles add the tag to a product created from the panel */
  signature?: boolean;
};

export type EditorContextValue = {
  openSlot: (slot: SlotDescriptor) => void;
};

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue | null {
  return useContext(EditorContext);
}
