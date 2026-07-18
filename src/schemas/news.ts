import { z } from "zod";

import { ContentStatus } from "@/generated/prisma/enums";

const optionalText = (maximum: number) => z.string().trim().max(maximum);

function isValidUtcInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}:00.000Z`).getTime());
}

export const newsFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
    slug: z
      .string()
      .trim()
      .max(200)
      .refine(
        (slug) => slug === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
        "Use lowercase letters, numbers, and single hyphens only.",
      ),
    excerpt: optionalText(500),
    content: z.string().trim().min(1, "Content is required."),
    coverImageUrl: z
      .string()
      .trim()
      .max(2_000)
      .refine(
        (value) => value === "" || z.url().safeParse(value).success,
        "Enter a valid URL.",
      ),
    coverImageAssetId: z.string().trim().max(64),
    coverImageAlt: optionalText(300),
    categoryId: z.string().trim().max(64),
    tagIds: z.array(z.string().trim().min(1).max(64)).max(50),
    status: z.enum(ContentStatus),
    featured: z.boolean(),
    publishedAt: z.string().trim(),
    scheduledFor: z.string().trim(),
  })
  .superRefine((data, context) => {
    if ((data.coverImageUrl || data.coverImageAssetId) && !data.coverImageAlt) {
      context.addIssue({
        code: "custom",
        path: ["coverImageAlt"],
        message: "Cover image alt text is required when a cover is provided.",
      });
    }

    if (data.publishedAt && !isValidUtcInput(data.publishedAt)) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Enter a valid published date and time.",
      });
    }

    if (data.status === ContentStatus.SCHEDULED) {
      if (!data.scheduledFor) {
        context.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Scheduled content requires a scheduled date.",
        });
      } else if (!isValidUtcInput(data.scheduledFor)) {
        context.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Enter a valid scheduled date and time.",
        });
      } else if (parseUtcInput(data.scheduledFor).getTime() <= Date.now()) {
        context.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Scheduled date must be in the future.",
        });
      }
    }
  });

export type NewsFormInput = z.infer<typeof newsFormSchema>;

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const newsQuerySchema = z.object({
  page: z.preprocess(
    firstQueryValue,
    z.coerce.number().int().min(1).max(10_000).default(1),
  ),
  search: z.preprocess(
    firstQueryValue,
    z.string().trim().max(100).default(""),
  ),
  status: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.enum(ContentStatus).optional()),
  category: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.string().trim().min(1).max(64).optional()),
  sort: z.preprocess(
    firstQueryValue,
    z.enum(["newest", "oldest"]).default("newest"),
  ),
});

export type NewsQuery = z.infer<typeof newsQuerySchema>;

export function generateSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "")
    .slice(0, 200)
    .replace(/-+$/g, "");

  return slug || "article";
}

export function parseUtcInput(value: string): Date {
  return new Date(`${value}:00.000Z`);
}

export function formatUtcInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
}

export function normalizeNewsInput(
  input: NewsFormInput,
  options: { now?: Date; existingPublishedAt?: Date | null } = {},
) {
  const now = options.now ?? new Date();
  const requestedPublishedAt = input.publishedAt
    ? parseUtcInput(input.publishedAt)
    : null;
  const publishedAt =
    input.status === ContentStatus.PUBLISHED
      ? requestedPublishedAt ?? options.existingPublishedAt ?? now
      : input.status === ContentStatus.ARCHIVED
        ? requestedPublishedAt ?? options.existingPublishedAt ?? null
        : requestedPublishedAt ?? options.existingPublishedAt ?? null;

  return {
    title: input.title,
    slug: input.slug || generateSlug(input.title),
    excerpt: input.excerpt || null,
    content: input.content,
    coverImageUrl: input.coverImageUrl || null,
    coverImageAssetId: input.coverImageAssetId || null,
    coverImageAlt: input.coverImageAlt || null,
    categoryId: input.categoryId || null,
    tagIds: [...new Set(input.tagIds)],
    status: input.status,
    featured: input.featured,
    publishedAt,
    scheduledFor:
      input.status === ContentStatus.SCHEDULED
        ? parseUtcInput(input.scheduledFor)
        : null,
    archivedAt: input.status === ContentStatus.ARCHIVED ? now : null,
  };
}
