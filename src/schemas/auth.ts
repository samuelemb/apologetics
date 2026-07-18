import { z } from "zod";

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .max(254, "Email is too long.")
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password is too long."),
});

export type CredentialsInput = z.input<typeof credentialsSchema>;

