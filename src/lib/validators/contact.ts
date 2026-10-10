import { z } from "zod";
import { turnstileTokenSchema } from "./common";
import { optionalWhatsappNumberSchema } from "./settings";

/** PW-42: the contact form. The phone is optional; when given it is a WhatsApp number. */
export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "errors.required").max(120, "errors.tooLong"),
  email: z.email("errors.email").max(200, "errors.tooLong"),
  phone: optionalWhatsappNumberSchema,
  message: z.string().trim().min(10, "errors.tooShort").max(3000, "errors.tooLong"),
  turnstileToken: turnstileTokenSchema,
});
export type ContactFormValues = z.input<typeof contactFormSchema>;
export type ContactFormInput = z.output<typeof contactFormSchema>;
export const emptyContactForm: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
  turnstileToken: "",
};
