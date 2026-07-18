import { z } from "zod";

import { UserRole, UserStatus } from "@/generated/prisma/enums";

const normalizedEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .max(254, "Email is too long.")
  .transform((email) => email.toLowerCase());

const imageUrlSchema = z
  .string()
  .trim()
  .max(2_048, "Image URL is too long.")
  .refine((value) => {
    if (!value) return true;

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid HTTP or HTTPS image URL.");

const userProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be 120 characters or fewer."),
  email: normalizedEmailSchema,
  image: imageUrlSchema,
  role: z.enum(UserRole),
});

const temporaryPasswordSchema = z
  .string()
  .max(128, "Temporary password is too long.");

export const userCreateSchema = userProfileSchema
  .extend({
    status: z.enum([UserStatus.ACTIVE, UserStatus.INVITED]),
    temporaryPassword: temporaryPasswordSchema,
  })
  .superRefine((input, context) => {
    if (input.status === UserStatus.INVITED) {
      if (input.temporaryPassword) {
        context.addIssue({
          code: "custom",
          path: ["temporaryPassword"],
          message: "Invited users do not receive a temporary password yet.",
        });
      }
      return;
    }

    const password = input.temporaryPassword;
    const requirements = [
      password.length >= 12,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
    ];

    if (!requirements.every(Boolean)) {
      context.addIssue({
        code: "custom",
        path: ["temporaryPassword"],
        message:
          "Use at least 12 characters with uppercase, lowercase, and a number.",
      });
    }
  });

export const userEditSchema = userProfileSchema.extend({
  status: z.enum(UserStatus),
});

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

const optionalQueryEnum = <T extends Record<string, string>>(
  values: T,
) =>
  z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined
      ? undefined
      : normalized;
  }, z.enum(values).optional());

export const userQuerySchema = z.object({
  page: z.preprocess(
    firstQueryValue,
    z.coerce.number().int().min(1).max(10_000).default(1),
  ),
  search: z.preprocess(
    firstQueryValue,
    z.string().trim().max(100).default(""),
  ),
  role: optionalQueryEnum(UserRole),
  status: optionalQueryEnum(UserStatus),
  sort: z.preprocess(
    firstQueryValue,
    z
      .enum(["newest", "oldest", "alphabetical", "recent-login"])
      .default("newest"),
  ),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserEditInput = z.infer<typeof userEditSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;

export function normalizeUserProfile(
  input: UserCreateInput | UserEditInput,
) {
  return {
    name: input.name,
    email: input.email,
    image: input.image || null,
    role: input.role,
    status: input.status,
  };
}
