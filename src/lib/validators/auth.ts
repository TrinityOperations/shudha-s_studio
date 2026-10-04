import { z } from "zod";
import { adminNextPathSchema, turnstileTokenSchema } from "./common";

export const loginSchema = z.object({
  email: z.email("errors.email"),
  password: z.string().min(1, "errors.required"),
  turnstileToken: turnstileTokenSchema,
  next: adminNextPathSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
