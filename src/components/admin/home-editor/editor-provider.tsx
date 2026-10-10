"use client";
import { useState, type ReactNode } from "react";
import type { ProductFormTaxonomy } from "@/components/admin/product-form";
import { EditorContext, type SlotDescriptor } from "@/lib/home-editor/context";
import { EditingBar } from "./editing-bar";
import { PickerSheet } from "./picker-sheet";

type Props = { initialDirty: boolean; taxonomy: ProductFormTaxonomy; children: ReactNode };

/** Provides the editor context to the home sections and owns the bar and the picker panel. */
export function EditorProvider({ initialDirty, taxonomy, children }: Props) {
  const [dirty, setDirty] = useState(initialDirty);
  const [slot, setSlot] = useState<SlotDescriptor | null>(null);
  return (
    <EditorContext.Provider value={{ openSlot: setSlot }}>
      <EditingBar dirty={dirty} onChanged={setDirty} />
      {children}
      <PickerSheet
        slot={slot}
        taxonomy={taxonomy}
        onClose={() => setSlot(null)}
        onChanged={setDirty}
      />
    </EditorContext.Provider>
  );
}
