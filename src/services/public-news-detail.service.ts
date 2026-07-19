import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { ContentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const publicNewsDetailSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImageUrl: true,
  coverImageAlt: true,
  publishedAt: true,
  updatedAt: true,
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
  tags: {
    orderBy: {
      tag: {
        name: "asc",
      },
    },
    select: {
      tag: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.NewsArticleSelect;

const relatedPublicNewsSelect = {
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

type SelectedPublicNewsDetail = Prisma.NewsArticleGetPayload<{
  select: typeof publicNewsDetailSelect;
}>;

export type PublicNewsDetailArticle = Omit<
  SelectedPublicNewsDetail,
  "tags"
> & {
  tags: Array<{
    name: string;
    slug: string;
  }>;
};

export type RelatedPublicNewsArticle = Prisma.NewsArticleGetPayload<{
  select: typeof relatedPublicNewsSelect;
}>;

export type GetRelatedPublicNewsArticlesInput = {
  articleId: string;
  categorySlug?: string | null;
  tagSlugs?: string[];
  limit?: number;
};

const DEFAULT_RELATED_LIMIT = 3;
const MAX_RELATED_LIMIT = 6;

function normalizeRelatedLimit(limit: number | undefined) {
  if (
    typeof limit !== "number" ||
    !Number.isFinite(limit) ||
    !Number.isInteger(limit) ||
    limit <= 0
  ) {
    return DEFAULT_RELATED_LIMIT;
  }

  return Math.min(limit, MAX_RELATED_LIMIT);
}

function normalizeOptionalSlug(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function normalizeTagSlugs(tagSlugs: string[] | undefined) {
  if (!Array.isArray(tagSlugs)) {
    return [];
  }

  return Array.from(
    new Set(
      tagSlugs
        .filter((tagSlug): tagSlug is string => typeof tagSlug === "string")
        .map((tagSlug) => tagSlug.trim())
        .filter(Boolean),
    ),
  );
}

async function queryPublicNewsArticleBySlug(
  slug: string,
): Promise<PublicNewsDetailArticle | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const now = new Date();
  const article = await prisma.newsArticle.findFirst({
    where: {
      slug: normalizedSlug,
      status: ContentStatus.PUBLISHED,
      publishedAt: {
        not: null,
        lte: now,
      },
    },
    select: publicNewsDetailSelect,
  });

  if (!article) {
    return null;
  }

  return {
    ...article,
    tags: article.tags.map(({ tag }) => tag),
  };
}

export const getPublicNewsArticleBySlug = cache(
  queryPublicNewsArticleBySlug,
);

export async function getRelatedPublicNewsArticles(
  input: GetRelatedPublicNewsArticlesInput,
): Promise<RelatedPublicNewsArticle[]> {
  const articleId = input.articleId.trim();

  if (!articleId) {
    return [];
  }

  const limit = normalizeRelatedLimit(input.limit);
  const categorySlug = normalizeOptionalSlug(input.categorySlug);
  const tagSlugs = normalizeTagSlugs(input.tagSlugs);
  const now = new Date();
  const selectedArticles: RelatedPublicNewsArticle[] = [];
  const excludedIds = new Set([articleId]);
  const publicationWhere = {
    status: ContentStatus.PUBLISHED,
    publishedAt: {
      not: null,
      lte: now,
    },
  } satisfies Prisma.NewsArticleWhereInput;

  async function appendGroup(extraWhere: Prisma.NewsArticleWhereInput) {
    const remaining = limit - selectedArticles.length;

    if (remaining <= 0) {
      return;
    }

    const articles = await prisma.newsArticle.findMany({
      where: {
        ...publicationWhere,
        ...extraWhere,
        id: {
          notIn: Array.from(excludedIds),
        },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: remaining,
      select: relatedPublicNewsSelect,
    });

    for (const article of articles) {
      if (!excludedIds.has(article.id)) {
        excludedIds.add(article.id);
        selectedArticles.push(article);
      }
    }
  }

  if (categorySlug) {
    await appendGroup({
      category: {
        is: {
          slug: categorySlug,
        },
      },
    });
  }

  if (tagSlugs.length > 0 && selectedArticles.length < limit) {
    await appendGroup({
      tags: {
        some: {
          tag: {
            slug: {
              in: tagSlugs,
            },
          },
        },
      },
    });
  }

  if (selectedArticles.length < limit) {
    await appendGroup({});
  }

  return selectedArticles;
}
