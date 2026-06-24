import { z } from "zod";

/**
 * Sign-in: the email must be well-formed; the password is only "required" — we
 * deliberately don't re-validate its length, since existing accounts may
 * predate any password policy.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Account creation: validate the email + a minimum password strength up front. */
export const signupSchema = z.object({
  name: z.string().trim().max(80, "That name is too long").optional(),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});
export type SignupValues = z.infer<typeof signupSchema>;
