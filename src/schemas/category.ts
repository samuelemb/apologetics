import { z } from "zod";

import { CategoryType } from "@/generated/prisma/enums";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  slug: z
    .string()
    .trim()
    .max(160)
    .refine(
      (slug) => slug === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
      "Use lowercase letters, numbers, and single hyphens only.",
    ),
  description: z.string().trim().max(1_000),
  type: z.enum(CategoryType),
  isActive: z.boolean(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const categoryQuerySchema = z.object({
  page: z.preprocess(
    firstQueryValue,
    z.coerce.number().int().min(1).max(10_000).default(1),
  ),
  search: z.preprocess(firstQueryValue, z.string().trim().max(100).default("")),
  type: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.enum(CategoryType).optional()),
  active: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.enum(["true", "false"]).optional()),
  sort: z.preprocess(
    firstQueryValue,
    z.enum(["newest", "oldest", "alphabetical"]).default("newest"),
  ),
});

export type CategoryQuery = z.infer<typeof categoryQuerySchema>;

export function generateCategorySlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");

  return slug || "category";
}

export function normalizeCategoryInput(input: CategoryFormInput) {
  return {
    name: input.name,
    slug: input.slug || generateCategorySlug(input.name),
    description: input.description || null,
    type: input.type,
    isActive: input.isActive,
  };
}
