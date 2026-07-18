import { z } from "zod";

import { EventStatus } from "@/generated/prisma/enums";

const optionalText = (maximum: number) => z.string().trim().max(maximum);

function validUtcInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const parsed = parseEventUtcInput(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 16) === value;
}

function validOptionalUrl(value: string): boolean {
  return value === "" || z.url().safeParse(value).success;
}

export const eventFormSchema = z
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
    summary: optionalText(500),
    content: z.string().trim().min(1, "Content is required."),
    coverImageUrl: z
      .string()
      .trim()
      .max(2_000)
      .refine(validOptionalUrl, "Enter a valid URL."),
    coverImageAssetId: z.string().trim().max(64),
    coverImageAlt: optionalText(300),
    categoryId: z.string().trim().max(64),
    tagIds: z.array(z.string().trim().min(1).max(64)).max(50),
    status: z.enum(EventStatus),
    featured: z.boolean(),
    startAt: z.string().trim().min(1, "Start date is required."),
    endAt: z.string().trim(),
    location: optionalText(300),
    isOnline: z.boolean(),
    onlineUrl: z
      .string()
      .trim()
      .max(2_000)
      .refine(validOptionalUrl, "Enter a valid online URL."),
    registrationUrl: z
      .string()
      .trim()
      .max(2_000)
      .refine(validOptionalUrl, "Enter a valid registration URL."),
    registrationDeadline: z.string().trim(),
    capacity: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d+$/.test(value),
        "Capacity must be a positive integer.",
      )
      .refine(
        (value) => value === "" || Number(value) > 0,
        "Capacity must be a positive integer.",
      ),
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

    if (!validUtcInput(data.startAt)) {
      context.addIssue({
        code: "custom",
        path: ["startAt"],
        message: "Enter a valid start date and time.",
      });
      return;
    }

    const startAt = parseEventUtcInput(data.startAt);
    if (data.endAt) {
      if (!validUtcInput(data.endAt)) {
        context.addIssue({
          code: "custom",
          path: ["endAt"],
          message: "Enter a valid end date and time.",
        });
      } else if (parseEventUtcInput(data.endAt).getTime() <= startAt.getTime()) {
        context.addIssue({
          code: "custom",
          path: ["endAt"],
          message: "End date must be later than the start date.",
        });
      }
    }

    if (data.registrationDeadline) {
      if (!validUtcInput(data.registrationDeadline)) {
        context.addIssue({
          code: "custom",
          path: ["registrationDeadline"],
          message: "Enter a valid registration deadline.",
        });
      } else if (
        parseEventUtcInput(data.registrationDeadline).getTime() >
        startAt.getTime()
      ) {
        context.addIssue({
          code: "custom",
          path: ["registrationDeadline"],
          message: "Registration deadline cannot be later than the start date.",
        });
      }
    }

    if (data.isOnline && !data.onlineUrl) {
      context.addIssue({
        code: "custom",
        path: ["onlineUrl"],
        message: "Online events require an online URL.",
      });
    }
    if (!data.isOnline && !data.location) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Physical events require a location.",
      });
    }

    if (data.publishedAt && !validUtcInput(data.publishedAt)) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Enter a valid published date and time.",
      });
    }

    if (data.status === EventStatus.SCHEDULED) {
      if (!data.scheduledFor) {
        context.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Scheduled publication requires a scheduled date.",
        });
      } else if (!validUtcInput(data.scheduledFor)) {
        context.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Enter a valid scheduled publication date.",
        });
      } else if (parseEventUtcInput(data.scheduledFor).getTime() <= Date.now()) {
        context.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Scheduled publication date must be in the future.",
        });
      }
    }
  });

export type EventFormInput = z.infer<typeof eventFormSchema>;

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const eventQuerySchema = z.object({
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
  }, z.enum(EventStatus).optional()),
  category: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.string().trim().min(1).max(64).optional()),
  mode: z.preprocess((value) => {
    const normalized = firstQueryValue(value);
    return normalized === "" || normalized === undefined ? undefined : normalized;
  }, z.enum(["online", "physical"]).optional()),
  sort: z.preprocess(
    firstQueryValue,
    z.enum(["newest", "oldest", "start"]).default("newest"),
  ),
});

export type EventQuery = z.infer<typeof eventQuerySchema>;

export function generateEventSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "")
    .slice(0, 200)
    .replace(/-+$/g, "");

  return slug || "event";
}

export function parseEventUtcInput(value: string): Date {
  return new Date(`${value}:00.000Z`);
}

export function formatEventUtcInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
}

export function normalizeEventInput(
  input: EventFormInput,
  options: { now?: Date; existingPublishedAt?: Date | null } = {},
) {
  const now = options.now ?? new Date();
  const requestedPublishedAt = input.publishedAt
    ? parseEventUtcInput(input.publishedAt)
    : null;
  const preservesPublishedDate =
    input.status === EventStatus.ARCHIVED ||
    input.status === EventStatus.CANCELLED;
  const publishedAt =
    input.status === EventStatus.PUBLISHED
      ? requestedPublishedAt ?? options.existingPublishedAt ?? now
      : preservesPublishedDate
        ? requestedPublishedAt ?? options.existingPublishedAt ?? null
        : requestedPublishedAt ?? options.existingPublishedAt ?? null;

  return {
    title: input.title,
    slug: input.slug || generateEventSlug(input.title),
    summary: input.summary || null,
    content: input.content,
    coverImageUrl: input.coverImageUrl || null,
    coverImageAssetId: input.coverImageAssetId || null,
    coverImageAlt: input.coverImageAlt || null,
    categoryId: input.categoryId || null,
    tagIds: [...new Set(input.tagIds)],
    status: input.status,
    featured: input.featured,
    startAt: parseEventUtcInput(input.startAt),
    endAt: input.endAt ? parseEventUtcInput(input.endAt) : null,
    location: input.location || null,
    isOnline: input.isOnline,
    onlineUrl: input.isOnline ? input.onlineUrl : null,
    registrationUrl: input.registrationUrl || null,
    registrationDeadline: input.registrationDeadline
      ? parseEventUtcInput(input.registrationDeadline)
      : null,
    capacity: input.capacity ? Number(input.capacity) : null,
    publishedAt,
    scheduledFor:
      input.status === EventStatus.SCHEDULED
        ? parseEventUtcInput(input.scheduledFor)
        : null,
  };
}
