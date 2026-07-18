import { z } from "zod";

export const tagFormSchema = z.object({
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
  isActive: z.boolean(),
});

export type TagFormInput = z.infer<typeof tagFormSchema>;

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const tagQuerySchema = z.object({
  page: z.preprocess(
    firstQueryValue,
    z.coerce.number().int().min(1).max(10_000).default(1),
  ),
  search: z.preprocess(firstQueryValue, z.string().trim().max(100).default("")),
  active: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.enum(["true", "false"]).optional()),
  usage: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.enum(["used", "unused"]).optional()),
  sort: z.preprocess(
    firstQueryValue,
    z.enum(["newest", "oldest", "alphabetical"]).default("newest"),
  ),
});

export type TagQuery = z.infer<typeof tagQuerySchema>;

export function generateTagSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");

  return slug || "tag";
}

export function normalizeTagInput(input: TagFormInput) {
  return {
    name: input.name,
    slug: input.slug || generateTagSlug(input.name),
    description: input.description || null,
    isActive: input.isActive,
  };
}
