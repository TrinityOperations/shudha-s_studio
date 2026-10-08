import {
  detailsStepSchema,
  MAX_WIZARD_PHOTOS,
  occasionStepSchema,
  orderForStepSchema,
  productTypeStepSchema,
  quantityStepSchema,
  WIZARD_STEP_COUNT,
  type BRIEF_LANGUAGES,
  type ORDER_FOR,
} from "@/lib/validators/brief";

// PW-50, PW-53: the whole wizard lives in this reducer until the final submit. Nothing is
// persisted; Back and the step links only move `step`, so every answer survives.

export const PRODUCT_CHOICE_PRESELECTED = "product";
export const CHOICE_OTHER = "other";

export type WizardPhoto = {
  id: string;
  file: File;
  /** Object URL for the thumbnail; the component owns its lifetime. */
  url: string;
};

export type WizardDetails = {
  names: string;
  dates: string;
  message: string;
  language: (typeof BRIEF_LANGUAGES)[number];
};

export type WizardState = {
  /** 1-based, 1..WIZARD_STEP_COUNT */
  step: number;
  /** Highest step the customer has completed; the indicator links back to these. */
  completedThrough: number;
  /** Melbourne civil date, "yyyy-MM-dd"; supplied by the server so validation matches the action. */
  today: string;
  /** Category slug, "product" (preselected), "other" or "" */
  productChoice: string;
  productOther: string;
  /** Resolved label stored in the brief */
  productType: string;
  productSlug: string;
  occasionChoice: string;
  occasionOther: string;
  occasion: string;
  orderFor: (typeof ORDER_FOR)[number] | "";
  businessName: string;
  details: WizardDetails;
  photos: WizardPhoto[];
  quantity: string;
  neededBy: string;
};

export type WizardAction =
  | { type: "productType"; choice: string; label: string }
  | { type: "productOther"; text: string }
  | { type: "occasion"; choice: string; label: string }
  | { type: "occasionOther"; text: string }
  | { type: "orderFor"; value: (typeof ORDER_FOR)[number] }
  | { type: "businessName"; value: string }
  | { type: "details"; patch: Partial<WizardDetails> }
  | { type: "addPhotos"; photos: WizardPhoto[] }
  | { type: "removePhoto"; id: string }
  | { type: "quantity"; value: string }
  | { type: "neededBy"; value: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "goTo"; step: number }
  | { type: "reset" };

export type PreselectedProduct = { slug: string; title: string };

export function initialWizardState(
  today: string,
  product?: PreselectedProduct | null,
): WizardState {
  return {
    step: 1,
    completedThrough: 0,
    today,
    productChoice: product ? PRODUCT_CHOICE_PRESELECTED : "",
    productOther: "",
    productType: product?.title ?? "",
    productSlug: product?.slug ?? "",
    occasionChoice: "",
    occasionOther: "",
    occasion: "",
    orderFor: "",
    businessName: "",
    details: { names: "", dates: "", message: "", language: "en" },
    photos: [],
    quantity: "1",
    neededBy: "",
  };
}

/** Whether `step` passes its Zod schema with the current answers. Steps 5 and 7 gate themselves. */
export function isStepValid(state: WizardState, step: number): boolean {
  switch (step) {
    case 1:
      return productTypeStepSchema.safeParse({
        productType: state.productType,
        productSlug: state.productSlug,
      }).success;
    case 2:
      return occasionStepSchema.safeParse({ occasion: state.occasion }).success;
    case 3:
      return orderForStepSchema.safeParse({
        orderFor: state.orderFor,
        businessName: state.businessName,
      }).success;
    case 4:
      return detailsStepSchema.safeParse(state.details).success;
    case 5:
      return true;
    case 6:
      return quantityStepSchema(state.today).safeParse({
        quantity: state.quantity,
        neededBy: state.neededBy,
      }).success;
    default:
      return true;
  }
}

/** A step is reachable when every step before it has been completed. */
export function canGoTo(state: WizardState, step: number): boolean {
  return step >= 1 && step <= WIZARD_STEP_COUNT && step <= state.completedThrough + 1;
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "productType":
      return {
        ...state,
        productChoice: action.choice,
        productType: action.choice === CHOICE_OTHER ? state.productOther : action.label,
        productSlug: action.choice === PRODUCT_CHOICE_PRESELECTED ? state.productSlug : "",
      };
    case "productOther":
      return {
        ...state,
        productOther: action.text,
        productType: state.productChoice === CHOICE_OTHER ? action.text : state.productType,
      };
    case "occasion":
      return {
        ...state,
        occasionChoice: action.choice,
        occasion: action.choice === CHOICE_OTHER ? state.occasionOther : action.label,
      };
    case "occasionOther":
      return {
        ...state,
        occasionOther: action.text,
        occasion: state.occasionChoice === CHOICE_OTHER ? action.text : state.occasion,
      };
    case "orderFor":
      return { ...state, orderFor: action.value };
    case "businessName":
      return { ...state, businessName: action.value };
    case "details":
      return { ...state, details: { ...state.details, ...action.patch } };
    case "addPhotos": {
      const room = Math.max(0, MAX_WIZARD_PHOTOS - state.photos.length);
      return { ...state, photos: [...state.photos, ...action.photos.slice(0, room)] };
    }
    case "removePhoto":
      return { ...state, photos: state.photos.filter((p) => p.id !== action.id) };
    case "quantity":
      return { ...state, quantity: action.value };
    case "neededBy":
      return { ...state, neededBy: action.value };
    case "next": {
      if (state.step >= WIZARD_STEP_COUNT || !isStepValid(state, state.step)) return state;
      return {
        ...state,
        step: state.step + 1,
        completedThrough: Math.max(state.completedThrough, state.step),
      };
    }
    case "back":
      return state.step > 1 ? { ...state, step: state.step - 1 } : state;
    case "goTo":
      return canGoTo(state, action.step) ? { ...state, step: action.step } : state;
    case "reset":
      return initialWizardState(state.today, null);
  }
}
