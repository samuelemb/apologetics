import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { CategoryType, ContentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 24;

const publicNewsArticleSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  coverImageAlt: true,
  publishedAt: true,
  viewCount: true,
  author: {
    select: {
      name: true,
    },
  },
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.NewsArticleSelect;

const publicNewsCategorySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

export type ListPublicNewsInput = {
  categorySlug?: string;
  cursor?: string;
  limit?: number;
};

export type PublicNewsArticle = Prisma.NewsArticleGetPayload<{
  select: typeof publicNewsArticleSelect;
}>;

export type PublicNewsCategory = Prisma.CategoryGetPayload<{
  select: typeof publicNewsCategorySelect;
}>;

export type ListPublicNewsResult = {
  articles: PublicNewsArticle[];
  nextCursor: string | null;
  hasMore: boolean;
};

type DecodedNewsCursor = {
  publishedAt: Date;
  id: string;
};

function normalizeLimit(limit: number | undefined) {
  if (
    typeof limit !== "number" ||
    !Number.isFinite(limit) ||
    !Number.isInteger(limit) ||
    limit <= 0
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
}

function normalizeCategorySlug(categorySlug: string | undefined) {
  if (typeof categorySlug !== "string") {
    return undefined;
  }

  return categorySlug.trim() || undefined;
}

function decodeCursor(cursor: string | undefined): DecodedNewsCursor | null {
  if (
    typeof cursor !== "string" ||
    cursor.length === 0 ||
    cursor.length > 1024 ||
    !/^[A-Za-z0-9_-]+$/.test(cursor)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const publishedAtValue = candidate.publishedAt;

    if (!id || typeof publishedAtValue !== "string") {
      return null;
    }

    const publishedAt = new Date(publishedAtValue);

    if (Number.isNaN(publishedAt.getTime())) {
      return null;
    }

    return { publishedAt, id };
  } catch {
    return null;
  }
}

function encodeCursor(article: PublicNewsArticle) {
  if (!article.publishedAt) {
    return null;
  }

  return Buffer.from(
    JSON.stringify({
      publishedAt: article.publishedAt.toISOString(),
      id: article.id,
    }),
  ).toString("base64url");
}

export async function listPublicNews(
  input: ListPublicNewsInput = {},
): Promise<ListPublicNewsResult> {
  const now = new Date();
  const limit = normalizeLimit(input.limit);
  const categorySlug = normalizeCategorySlug(input.categorySlug);
  const cursor = decodeCursor(input.cursor);

  const articles = await prisma.newsArticle.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      publishedAt: {
        not: null,
        lte: now,
      },
      ...(categorySlug
        ? {
            category: {
              is: {
                slug: categorySlug,
              },
            },
          }
        : {}),
      ...(cursor
        ? {
            OR: [
              {
                publishedAt: {
                  lt: cursor.publishedAt,
                },
              },
              {
                publishedAt: cursor.publishedAt,
                id: {
                  lt: cursor.id,
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: publicNewsArticleSelect,
  });

  const hasMore = articles.length > limit;
  const pageArticles = hasMore ? articles.slice(0, limit) : articles;
  const lastArticle = pageArticles[pageArticles.length - 1];

  return {
    articles: pageArticles,
    nextCursor:
      hasMore && lastArticle ? encodeCursor(lastArticle) : null,
    hasMore,
  };
}

export async function listPublicNewsCategories(): Promise<
  PublicNewsCategory[]
> {
  const now = new Date();

  return prisma.category.findMany({
    where: {
      isActive: true,
      type: {
        in: [CategoryType.NEWS, CategoryType.GENERAL],
      },
      newsArticles: {
        some: {
          status: ContentStatus.PUBLISHED,
          publishedAt: {
            not: null,
            lte: now,
          },
        },
      },
    },
    orderBy: { name: "asc" },
    select: publicNewsCategorySelect,
  });
}
