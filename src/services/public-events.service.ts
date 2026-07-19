import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { CategoryType, EventStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 24;

const publicEventSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  coverImageUrl: true,
  coverImageAlt: true,
  startAt: true,
  endAt: true,
  registrationDeadline: true,
  isOnline: true,
  location: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.EventSelect;

const publicEventCategorySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

type PublicEventPeriod = "upcoming" | "past";
type PublicEventFormat = "all" | "online" | "physical";

export type PublicEventsInput = {
  period?: PublicEventPeriod;
  format?: PublicEventFormat;
  categorySlug?: string;
  page?: number;
  limit?: number;
};

export type PublicEventListItem = Prisma.EventGetPayload<{
  select: typeof publicEventSelect;
}>;

export type PublicEventsResult = {
  events: PublicEventListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PublicEventCategory = Prisma.CategoryGetPayload<{
  select: typeof publicEventCategorySelect;
}>;

function normalizePeriod(value: PublicEventsInput["period"]): PublicEventPeriod {
  return value === "past" ? "past" : "upcoming";
}

function normalizeFormat(value: PublicEventsInput["format"]): PublicEventFormat {
  return value === "online" || value === "physical" ? value : "all";
}

function normalizePage(value: PublicEventsInput["page"]) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : DEFAULT_PAGE;
}

function normalizeLimit(value: PublicEventsInput["limit"]) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  const normalized = Math.floor(value);
  return normalized >= 1 ? Math.min(normalized, MAX_LIMIT) : DEFAULT_LIMIT;
}

function getPublicationWhere(now: Date): Prisma.EventWhereInput {
  return {
    status: EventStatus.PUBLISHED,
    publishedAt: {
      not: null,
      lte: now,
    },
  };
}

export async function listPublicEvents(
  input: PublicEventsInput = {},
): Promise<PublicEventsResult> {
  const now = new Date();
  const period = normalizePeriod(input.period);
  const format = normalizeFormat(input.format);
  const page = normalizePage(input.page);
  const pageSize = normalizeLimit(input.limit);
  const categorySlug = input.categorySlug?.trim() || null;

  const periodWhere: Prisma.EventWhereInput =
    period === "past"
      ? {
          OR: [
            { endAt: { lt: now } },
            { endAt: null, startAt: { lt: now } },
          ],
        }
      : {
          OR: [
            { endAt: { gte: now } },
            { endAt: null, startAt: { gte: now } },
          ],
        };

  const where = {
    ...getPublicationWhere(now),
    ...periodWhere,
    ...(format === "online"
      ? { isOnline: true }
      : format === "physical"
        ? { isOnline: false }
        : {}),
    ...(categorySlug
      ? {
          category: {
            is: {
              slug: categorySlug,
              isActive: true,
              type: { in: [CategoryType.EVENT, CategoryType.GENERAL] },
            },
          },
        }
      : {}),
  } satisfies Prisma.EventWhereInput;

  const total = await prisma.event.count({ where });
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  if (page > totalPages) {
    return {
      events: [],
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  const events = await prisma.event.findMany({
    where,
    orderBy:
      period === "past"
        ? [{ startAt: "desc" }, { id: "desc" }]
        : [{ startAt: "asc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: publicEventSelect,
  });

  return {
    events,
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function listPublicEventCategories(): Promise<
  PublicEventCategory[]
> {
  const now = new Date();

  return prisma.category.findMany({
    where: {
      isActive: true,
      type: { in: [CategoryType.EVENT, CategoryType.GENERAL] },
      events: {
        some: getPublicationWhere(now),
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: publicEventCategorySelect,
  });
}
