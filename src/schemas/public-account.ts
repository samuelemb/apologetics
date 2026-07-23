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
    token: z.string().trim().min(32, "Reset authorization is invalid.").max(128, "Reset authorization is invalid."),
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

const profileText = (maximum: number) =>
  z.string().optional().default("").pipe(z.string().trim().max(maximum)).transform((value) => value || null);

const reservedUsernames = new Set([
  "account", "activity", "admin", "api", "auth", "about", "contact", "events",
  "login", "magazine", "news", "notifications", "profile", "security", "settings", "signup",
]);

export const publicProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  username: z.string().optional().default("").pipe(z.string().trim().toLowerCase().max(30)).transform((value) => value || null)
    .refine((value) => value === null || /^[a-z0-9_-]{3,30}$/.test(value), "Use 3–30 lowercase letters, numbers, hyphens, or underscores.")
    .refine((value) => value === null || !reservedUsernames.has(value), "That username is reserved."),
  bio: profileText(160),
  location: profileText(100),
  timezone: z.string().optional().default("").pipe(z.string().trim().max(100)).transform((value) => value || null).refine(
    (value) => value === null || Intl.supportedValuesOf("timeZone").includes(value),
    "Choose a valid timezone.",
  ),
  image: z.string().url().max(2048).nullable().optional(),
});

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;
export type PublicLoginInput = z.infer<typeof publicLoginSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type PublicProfileInput = z.infer<typeof publicProfileSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export const passwordResetCodeSchema = z.object({
  email: normalizedEmailSchema,
  code: z.string().trim().regex(/^\d{4}$/, "Enter the four-digit reset code."),
});

export type PasswordResetCodeInput = z.infer<typeof passwordResetCodeSchema>;
