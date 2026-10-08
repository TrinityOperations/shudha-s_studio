import { describe, expect, it } from "vitest";
import {
  canGoTo,
  initialWizardState,
  isStepValid,
  wizardReducer,
  type WizardAction,
  type WizardPhoto,
  type WizardState,
} from "./wizard-state";

const TODAY = "2026-10-08";

function run(state: WizardState, ...actions: WizardAction[]) {
  return actions.reduce(wizardReducer, state);
}

function photo(id: string): WizardPhoto {
  return { id, file: new File([new Uint8Array(4)], `${id}.jpg`, { type: "image/jpeg" }), url: id };
}

/** Answers steps 1–6 so the wizard can reach the booking step. */
function filled(): WizardState {
  return run(
    initialWizardState(TODAY),
    { type: "productType", choice: "mugs", label: "Mugs" },
    { type: "next" },
    { type: "occasion", choice: "eid", label: "Eid" },
    { type: "next" },
    { type: "orderFor", value: "personal" },
    { type: "next" },
    { type: "next" },
    { type: "next" },
    { type: "next" },
  );
}

describe("wizardReducer", () => {
  it("refuses to advance until the step is valid and records progress", () => {
    const start = initialWizardState(TODAY);
    expect(isStepValid(start, 1)).toBe(false);
    expect(wizardReducer(start, { type: "next" })).toBe(start);

    const chosen = run(start, { type: "productType", choice: "mugs", label: "Mugs" });
    expect(chosen.productType).toBe("Mugs");
    const next = wizardReducer(chosen, { type: "next" });
    expect(next).toMatchObject({ step: 2, completedThrough: 1 });
  });

  it("starts on the preselected product and clears the slug when another type is chosen", () => {
    const start = initialWizardState(TODAY, { slug: "eid-mug", title: "Eid Mug" });
    expect(start).toMatchObject({ productChoice: "product", productType: "Eid Mug" });
    expect(isStepValid(start, 1)).toBe(true);
    const changed = wizardReducer(start, { type: "productType", choice: "mugs", label: "Mugs" });
    expect(changed).toMatchObject({ productType: "Mugs", productSlug: "" });
    const backAgain = wizardReducer(changed, {
      type: "productType",
      choice: "product",
      label: "Eid Mug",
    });
    expect(backAgain.productSlug).toBe("");
  });

  it("keeps the free text typed under 'Something else' and 'Other' while switching chips", () => {
    let s = run(
      initialWizardState(TODAY),
      { type: "productType", choice: "other", label: "" },
      { type: "productOther", text: "A lamp" },
    );
    expect(s.productType).toBe("A lamp");
    s = wizardReducer(s, { type: "productType", choice: "mugs", label: "Mugs" });
    expect(s).toMatchObject({ productType: "Mugs", productOther: "A lamp" });
    s = wizardReducer(s, { type: "productType", choice: "other", label: "" });
    expect(s.productType).toBe("A lamp");

    s = run(
      s,
      { type: "occasion", choice: "other", label: "" },
      { type: "occasionOther", text: " Retirement " },
    );
    expect(s.occasion).toBe(" Retirement ");
    expect(isStepValid(s, 2)).toBe(true);
    s = wizardReducer(s, { type: "occasionOther", text: "   " });
    expect(isStepValid(s, 2)).toBe(false);
  });

  it("requires a business name only for business orders", () => {
    let s = run(initialWizardState(TODAY), { type: "orderFor", value: "business" });
    expect(isStepValid(s, 3)).toBe(false);
    s = wizardReducer(s, { type: "businessName", value: "A" });
    expect(isStepValid(s, 3)).toBe(false);
    s = wizardReducer(s, { type: "businessName", value: "Acme" });
    expect(isStepValid(s, 3)).toBe(true);
    s = wizardReducer(s, { type: "orderFor", value: "personal" });
    expect(isStepValid(s, 3)).toBe(true);
  });

  it("validates quantity and needed-by against the Melbourne date it was given", () => {
    let s = run(initialWizardState(TODAY), { type: "quantity", value: "0" });
    expect(isStepValid(s, 6)).toBe(false);
    s = run(s, { type: "quantity", value: "12" }, { type: "neededBy", value: "2026-10-07" });
    expect(isStepValid(s, 6)).toBe(false);
    s = wizardReducer(s, { type: "neededBy", value: TODAY });
    expect(isStepValid(s, 6)).toBe(true);
    s = wizardReducer(s, { type: "neededBy", value: "" });
    expect(isStepValid(s, 6)).toBe(true);
  });

  it("caps photos at three and removes by id", () => {
    let s = run(initialWizardState(TODAY), {
      type: "addPhotos",
      photos: [photo("a"), photo("b")],
    });
    s = wizardReducer(s, { type: "addPhotos", photos: [photo("c"), photo("d")] });
    expect(s.photos.map((p) => p.id)).toEqual(["a", "b", "c"]);
    s = wizardReducer(s, { type: "removePhoto", id: "b" });
    expect(s.photos.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("back and goTo keep every answer; goTo refuses steps not yet reached", () => {
    const done = filled();
    expect(done).toMatchObject({ step: 7, completedThrough: 6 });
    const back = run(done, { type: "back" }, { type: "back" });
    expect(back.step).toBe(5);
    expect(back.productType).toBe("Mugs");
    expect(back.occasion).toBe("Eid");
    expect(back.orderFor).toBe("personal");

    const fresh = run(
      initialWizardState(TODAY),
      { type: "productType", choice: "mugs", label: "Mugs" },
      { type: "next" },
      { type: "back" },
    );
    expect(canGoTo(fresh, 2)).toBe(true);
    expect(canGoTo(fresh, 3)).toBe(false);
    expect(wizardReducer(fresh, { type: "goTo", step: 3 })).toBe(fresh);
    expect(wizardReducer(fresh, { type: "goTo", step: 2 }).step).toBe(2);
    expect(wizardReducer(back, { type: "goTo", step: 7 }).step).toBe(7);
    expect(wizardReducer(back, { type: "goTo", step: 1 }).step).toBe(1);
    expect(wizardReducer(back, { type: "goTo", step: 0 })).toBe(back);
  });

  it("reset returns to a blank step 1 with the same date", () => {
    const s = wizardReducer(filled(), { type: "reset" });
    expect(s).toEqual(initialWizardState(TODAY));
  });
});
