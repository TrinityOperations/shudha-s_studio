"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createProductFromEditor,
  setHomeSlot,
  type ProductPhotoOption,
} from "@/actions/home-editor";
import { uploadSiteImage } from "@/actions/site-images";
import { ProductForm, type ProductFormTaxonomy } from "@/components/admin/product-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SlotDescriptor } from "@/lib/home-editor/context";
import { useT } from "@/lib/i18n/client";
import type { SlotValue } from "@/lib/validators/home-editor";
import { emptyProductInput, type ProductFormValues } from "@/lib/validators/products";
import { ProductsTab } from "./products-tab";
import { UploadTab, type PreparedUpload } from "./upload-tab";
import { VideoTab } from "./video-tab";

type Props = {
  slot: SlotDescriptor | null;
  taxonomy: ProductFormTaxonomy;
  onClose: () => void;
  onChanged: (dirty: boolean) => void;
};

type Stage = "pick" | "product";

/** The "Change photo" panel (docs/design.md, "Change photo panel"). */
export function PickerSheet({ slot, taxonomy, onClose, onChanged }: Props) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedUpload | null>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [productValues, setProductValues] = useState<ProductFormValues>(emptyProductInput);
  const [askKeep, setAskKeep] = useState(false);

  function reset() {
    setPrepared(null);
    setStage("pick");
    setProductValues(emptyProductInput);
    setAskKeep(false);
  }

  async function applyValue(value: SlotValue, successKey: Parameters<typeof t>[0]) {
    if (!slot) return;
    setBusy(true);
    try {
      const result = await setHomeSlot({
        slot: slot.id,
        value,
        shownProductIds: slot.shownProductIds ?? [],
      });
      if (!result.ok) return void toast.error(t(result.error));
      toast.success(t(successKey));
      onChanged(result.data.dirty);
      router.refresh();
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function pickProductPhoto(option: ProductPhotoOption) {
    if (!slot) return;
    if (slot.kind === "product" || slot.acceptsProduct) {
      void applyValue({ productId: option.productId }, "admin.editor.panel.placed");
    } else {
      void applyValue(
        {
          path: option.path,
          thumbPath: option.thumbPath,
          focus: { x: 0.5, y: 0.5 },
          bucket: "product-images",
        },
        "admin.editor.panel.placed",
      );
    }
  }

  async function justPhoto() {
    if (!slot || !prepared) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("purpose", "home");
      formData.set("focusX", String(prepared.focus.x));
      formData.set("focusY", String(prepared.focus.y));
      formData.set("file", prepared.file);
      const uploaded = await uploadSiteImage(formData);
      if (!uploaded.ok) return void toast.error(t(uploaded.error));
      await applyValue(uploaded.data, "admin.editor.panel.placed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(values: ProductFormValues, publish: boolean): Promise<boolean> {
    if (!slot || !prepared) return false;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("values", JSON.stringify(values));
      formData.set("publish", publish ? "1" : "0");
      formData.set("signature", slot.signature ? "1" : "0");
      formData.set("file", prepared.file);
      const result = await createProductFromEditor(formData);
      if (!result.ok) {
        toast.error(t(result.error));
        return false;
      }
      if (!publish) {
        toast.success(t("admin.editor.panel.productSavedDraft"));
        router.refresh();
        reset();
        onClose();
        return true;
      }
      if (slot.kind === "product" || slot.acceptsProduct) {
        await applyValue({ productId: result.data.id }, "admin.editor.panel.productPlaced");
      } else {
        await applyValue(
          {
            path: result.data.path,
            thumbPath: result.data.thumbPath,
            focus: prepared.focus,
            bucket: "product-images",
          },
          "admin.editor.panel.productPlaced",
        );
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  function requestClose() {
    if (busy) return;
    if (stage === "product" && prepared && productValues.title.trim()) {
      setAskKeep(true);
      return;
    }
    reset();
    onClose();
  }

  const open = slot !== null;
  const isVideo = slot?.kind === "heroVideo";

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && requestClose()}>
        <SheetContent
          side="right"
          className="bg-paper w-full overflow-y-auto p-6 sm:max-w-xl"
          data-testid="picker-sheet"
        >
          <SheetTitle className="font-heading text-ink text-2xl">
            {isVideo ? t("admin.editor.panel.videoTitle") : t("admin.editor.panel.title")}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm">
            {slot?.label}
          </SheetDescription>
          <div className="mt-6">
            {slot && isVideo ? (
              <VideoTab
                filled={slot.filled}
                onDone={(dirty) => {
                  onChanged(dirty);
                  router.refresh();
                  onClose();
                }}
              />
            ) : slot && stage === "product" && prepared ? (
              <div className="space-y-4">
                <h3 className="font-medium">{t("admin.editor.panel.productForm")}</h3>
                <ProductForm
                  mode="editor"
                  defaultValues={{ ...emptyProductInput, title: productValues.title }}
                  taxonomy={taxonomy}
                  photoUrl={prepared.url}
                  onValuesChange={setProductValues}
                  onSubmit={saveProduct}
                  onCancel={requestClose}
                />
              </div>
            ) : slot ? (
              <Tabs defaultValue="products">
                <TabsList>
                  <TabsTrigger value="products">{t("admin.editor.panel.fromProducts")}</TabsTrigger>
                  <TabsTrigger value="upload">{t("admin.editor.panel.upload")}</TabsTrigger>
                </TabsList>
                <TabsContent value="products" className="pt-4">
                  <ProductsTab onPick={pickProductPhoto} busy={busy} />
                </TabsContent>
                <TabsContent value="upload" className="pt-4">
                  <UploadTab
                    slot={slot}
                    prepared={prepared}
                    onPrepared={setPrepared}
                    onJustPhoto={justPhoto}
                    onNewProduct={() => setStage("product")}
                    busy={busy}
                  />
                </TabsContent>
              </Tabs>
            ) : null}
            {slot && !isVideo && slot.filled && stage === "pick" ? (
              <div className="mt-8 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => applyValue(null, "admin.editor.panel.placed")}
                >
                  {t("admin.editor.panel.remove")}
                </Button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={askKeep}
        onOpenChange={setAskKeep}
        title={t("admin.editor.unsavedProduct")}
        description={t("admin.editor.panel.productSavedDraft")}
        confirmLabel={t("admin.editor.panel.saveDraft")}
        pending={busy}
        onConfirm={async () => {
          const ok = await saveProduct(productValues, false);
          if (!ok) {
            setAskKeep(false);
            reset();
            onClose();
          }
        }}
      />
    </>
  );
}
