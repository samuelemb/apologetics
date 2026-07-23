import { z } from "zod";

const normalizedEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .max(254, "Email is too long.")
  .transform((email) => email.toLowerCase());

const publicPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Password is too long.")
  .refine((value) => /[a-z]/.test(value), "Include a lowercase letter.")
  .refine((value) => /[A-Z]/.test(value), "Include an uppercase letter.")
  .refine((value) => /[0-9]/.test(value), "Include a number.");

export const passwordResetRequestSchema = z.object({ email: normalizedEmailSchema });

export const passwordResetSchema = z
  .object({
    email: normalizedEmailSchema,
    code: z.string().trim().regex(/^\d{4}$/, "Enter the four-digit reset code."),
    password: publicPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const publicRegistrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(120, "Name must be 120 characters or fewer."),
    email: normalizedEmailSchema,
    password: publicPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const publicLoginSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1, "Password is required.").max(128),
});

export const emailVerificationSchema = z.object({
  email: normalizedEmailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the four-digit verification code."),
});

export const resendVerificationSchema = z.object({
  email: normalizedEmailSchema,
});

export const publicProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be 120 characters or fewer."),
});

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;
export type PublicLoginInput = z.infer<typeof publicLoginSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type PublicProfileInput = z.infer<typeof publicProfileSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
