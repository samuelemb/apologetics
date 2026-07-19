import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { CategoryType, ContentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const MIN_FOUR_DIGIT_YEAR = 1000;
const MAX_FOUR_DIGIT_YEAR = 9999;

const publicMagazineSelect = {
  id: true,
  title: true,
  slug: true,
  issueNumber: true,
  volume: true,
  description: true,
  coverImageUrl: true,
  coverImageAlt: true,
  publicationDate: true,
  pageCount: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.MagazineIssueSelect;

const publicMagazineCategorySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

export type PublicMagazineSort = "newest" | "oldest";

export type PublicMagazinesInput = {
  categorySlug?: string;
  year?: number | string;
  sort?: PublicMagazineSort;
  page?: number | string;
  limit?: number;
};

export type PublicMagazineListItem = Prisma.MagazineIssueGetPayload<{
  select: typeof publicMagazineSelect;
}>;

export type PublicMagazinesResult = {
  magazines: PublicMagazineListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: PublicMagazineSort;
  categorySlug: string | null;
  year: number | null;
};

export type PublicMagazineCategory = Prisma.CategoryGetPayload<{
  select: typeof publicMagazineCategorySelect;
}>;

function normalizeSort(
  value: PublicMagazinesInput["sort"],
): PublicMagazineSort {
  return value === "oldest" ? "oldest" : "newest";
}

function normalizePage(value: PublicMagazinesInput["page"]) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!/^\d+$/.test(trimmed)) {
      return DEFAULT_PAGE;
    }

    value = Number(trimmed);
  }

  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : DEFAULT_PAGE;
}

function normalizeLimit(value: PublicMagazinesInput["limit"]) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(value, MAX_LIMIT);
}

function normalizeYear(value: PublicMagazinesInput["year"]) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!/^[1-9]\d{3}$/.test(trimmed)) {
      return null;
    }

    value = Number(trimmed);
  }

  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= MIN_FOUR_DIGIT_YEAR &&
    value <= MAX_FOUR_DIGIT_YEAR
    ? value
    : null;
}

function getPublicMagazineWhere(
  now: Date,
): Prisma.MagazineIssueWhereInput {
  return {
    status: ContentStatus.PUBLISHED,
    publicationDate: {
      not: null,
      lte: now,
    },
  };
}

export async function listPublicMagazines(
  input: PublicMagazinesInput = {},
): Promise<PublicMagazinesResult> {
  const now = new Date();
  const sort = normalizeSort(input.sort);
  const page = normalizePage(input.page);
  const pageSize = normalizeLimit(input.limit);
  const categorySlug = input.categorySlug?.trim() || null;
  const year = normalizeYear(input.year);
  const yearWhere: Prisma.MagazineIssueWhereInput | null =
    year === null
      ? null
      : {
          publicationDate: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        };

  const where = {
    AND: yearWhere
      ? [getPublicMagazineWhere(now), yearWhere]
      : [getPublicMagazineWhere(now)],
    ...(categorySlug
      ? {
          category: {
            is: {
              slug: categorySlug,
              isActive: true,
              type: {
                in: [CategoryType.MAGAZINE, CategoryType.GENERAL],
              },
            },
          },
        }
      : {}),
  } satisfies Prisma.MagazineIssueWhereInput;

  const total = await prisma.magazineIssue.count({ where });
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  if (page > totalPages) {
    return {
      magazines: [],
      page,
      pageSize,
      total,
      totalPages,
      sort,
      categorySlug,
      year,
    };
  }

  const magazines = await prisma.magazineIssue.findMany({
    where,
    orderBy:
      sort === "oldest"
        ? [{ publicationDate: "asc" }, { id: "asc" }]
        : [{ publicationDate: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: publicMagazineSelect,
  });

  return {
    magazines,
    page,
    pageSize,
    total,
    totalPages,
    sort,
    categorySlug,
    year,
  };
}

export async function listPublicMagazineCategories(): Promise<
  PublicMagazineCategory[]
> {
  const now = new Date();

  return prisma.category.findMany({
    where: {
      isActive: true,
      type: { in: [CategoryType.MAGAZINE, CategoryType.GENERAL] },
      magazineIssues: {
        some: getPublicMagazineWhere(now),
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: publicMagazineCategorySelect,
  });
}

export async function listPublicMagazineYears(): Promise<number[]> {
  const now = new Date();
  const publicationDates = await prisma.magazineIssue.findMany({
    where: getPublicMagazineWhere(now),
    select: {
      publicationDate: true,
    },
  });
  const years = new Set<number>();

  for (const { publicationDate } of publicationDates) {
    if (!publicationDate || Number.isNaN(publicationDate.getTime())) {
      continue;
    }

    const year = publicationDate.getUTCFullYear();

    if (year >= MIN_FOUR_DIGIT_YEAR && year <= MAX_FOUR_DIGIT_YEAR) {
      years.add(year);
    }
  }

  return [...years].sort((a, b) => b - a);
}
