import { z } from "zod";

import { ContentStatus } from "@/generated/prisma/enums";

const MAX_INT = 2_147_483_647;
const optionalText = (maximum: number) => z.string().trim().max(maximum);

export function isValidMagazineRemoteUrl(value: string): boolean {
  if (value === "") return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validPublicationDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = parseMagazineDateInput(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validIntegerString(value: string, minimum: number): boolean {
  if (value === "") return true;
  if (!/^\d+$/.test(value)) return false;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= MAX_INT;
}

export const magazineFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    slug: z
      .string()
      .trim()
      .max(200)
      .refine(
        (slug) => slug === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
        "Use lowercase letters, numbers, and single hyphens only.",
      ),
    issueNumber: z.string().trim().min(1, "Issue number is required.").max(100),
    volume: optionalText(100),
    description: optionalText(10_000),
    coverImageUrl: z
      .string()
      .trim()
      .max(2_000)
      .refine(isValidMagazineRemoteUrl, "Enter a valid cover image URL."),
    coverImageAssetId: z.string().trim().max(64),
    coverImageAlt: optionalText(300),
    pdfUrl: z
      .string()
      .trim()
      .max(2_000)
      .refine(isValidMagazineRemoteUrl, "Enter a valid PDF URL."),
    pdfAssetId: z.string().trim().max(64),
    pdfFileName: z.string().trim().max(255),
    pdfFileSize: z
      .string()
      .trim()
      .refine(
        (value) => validIntegerString(value, 0),
        "PDF file size must be a non-negative integer.",
      ),
    pageCount: z
      .string()
      .trim()
      .refine(
        (value) => validIntegerString(value, 1),
        "Page count must be a positive integer.",
      ),
    publicationDate: z.string().trim(),
    categoryId: z.string().trim().max(64),
    tagIds: z.array(z.string().trim().min(1).max(64)).max(50),
    status: z.enum(ContentStatus),
    featured: z.boolean(),
  })
  .superRefine((data, context) => {
    if ((data.coverImageUrl || data.coverImageAssetId) && !data.coverImageAlt) {
      context.addIssue({
        code: "custom",
        path: ["coverImageAlt"],
        message: "Cover image alt text is required when a cover is provided.",
      });
    }

    if (!data.pdfUrl && !data.pdfAssetId) {
      context.addIssue({
        code: "custom",
        path: ["pdfUrl"],
        message: "Upload a PDF or provide an external PDF URL.",
      });
    }

    if (data.pdfUrl && !data.pdfAssetId && !data.pdfFileName) {
      context.addIssue({
        code: "custom",
        path: ["pdfFileName"],
        message: "PDF file name is required when a PDF URL is provided.",
      });
    }

    if (data.publicationDate && !validPublicationDate(data.publicationDate)) {
      context.addIssue({
        code: "custom",
        path: ["publicationDate"],
        message: "Enter a valid publication date.",
      });
    }

    if (data.status === ContentStatus.PUBLISHED && !data.publicationDate) {
      context.addIssue({
        code: "custom",
        path: ["publicationDate"],
        message: "Published magazine issues require a publication date.",
      });
    }

    if (data.status === ContentStatus.SCHEDULED) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Scheduled magazine publication is not supported by the current database schema.",
      });
    }
  });

export type MagazineFormInput = z.infer<typeof magazineFormSchema>;

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const magazineQuerySchema = z.object({
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
  featured: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.enum(["true", "false"]).optional()),
  sort: z.preprocess(
    firstQueryValue,
    z.enum(["newest", "oldest", "publication"]).default("newest"),
  ),
});

export type MagazineQuery = z.infer<typeof magazineQuerySchema>;

export function generateMagazineSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "")
    .slice(0, 200)
    .replace(/-+$/g, "");

  return slug || "magazine-issue";
}

export function parseMagazineDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatMagazineDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function normalizeMagazineInput(input: MagazineFormInput) {
  return {
    title: input.title,
    slug: input.slug || generateMagazineSlug(input.title),
    issueNumber: input.issueNumber,
    volume: input.volume || null,
    description: input.description || null,
    coverImageUrl: input.coverImageUrl || null,
    coverImageAssetId: input.coverImageAssetId || null,
    coverImageAlt: input.coverImageAlt || null,
    pdfUrl: input.pdfUrl,
    pdfAssetId: input.pdfAssetId || null,
    pdfFileName: input.pdfFileName || null,
    pdfFileSize: input.pdfFileSize === "" ? null : Number(input.pdfFileSize),
    pageCount: input.pageCount === "" ? null : Number(input.pageCount),
    publicationDate: input.publicationDate
      ? parseMagazineDateInput(input.publicationDate)
      : null,
    categoryId: input.categoryId || null,
    tagIds: [...new Set(input.tagIds)],
    status: input.status,
    featured: input.featured,
  };
}
