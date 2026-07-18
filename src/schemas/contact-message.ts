import { z } from "zod";

import { ContactMessageStatus } from "@/generated/prisma/enums";

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

const optionalStatusFilter = z.preprocess((value) => {
  const normalized = firstQueryValue(value);
  return normalized === "" || normalized === undefined
    ? undefined
    : normalized;
}, z.enum(ContactMessageStatus).optional());

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Enter a valid date.");

const optionalDateFilter = z.preprocess((value) => {
  const normalized = firstQueryValue(value);
  return normalized === "" || normalized === undefined
    ? undefined
    : normalized;
}, dateOnlySchema.optional());

export const contactMessageIdSchema = z
  .string()
  .trim()
  .min(1, "Contact message not found.")
  .max(191, "Contact message not found.")
  .refine((value) => !/\s/.test(value), "Contact message not found.");

export const contactMessageQuerySchema = z
  .object({
    page: z.preprocess(
      firstQueryValue,
      z.coerce.number().int().min(1).max(10_000).default(1),
    ),
    search: z.preprocess(
      firstQueryValue,
      z.string().trim().max(100).default(""),
    ),
    status: optionalStatusFilter,
    from: optionalDateFilter,
    to: optionalDateFilter,
    sort: z.preprocess(
      firstQueryValue,
      z.enum(["newest", "oldest", "alphabetical"]).default("newest"),
    ),
  })
  .superRefine((query, context) => {
    if (query.from && query.to && query.from > query.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end date must be on or after the start date.",
      });
    }
  });

export const contactMessageActionSchema = z.enum([
  "read",
  "replied",
  "archive",
  "spam",
  "restore",
]);

export const contactMessageNotesSchema = z.object({
  adminNotes: z
    .string()
    .max(5_000, "Admin notes must be 5,000 characters or fewer.")
    .transform((value) => value.trim()),
});

export type ContactMessageQuery = z.infer<typeof contactMessageQuerySchema>;
export type ContactMessageAction = z.infer<typeof contactMessageActionSchema>;
export type ContactMessageNotesInput = z.infer<
  typeof contactMessageNotesSchema
>;
