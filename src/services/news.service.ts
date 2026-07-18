import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { MediaAssetKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  canCreateNews,
  canDeleteNews,
  canEditNews,
  canUseNewsStatus,
} from "@/lib/news-policy";
import {
  formatUtcInput,
  normalizeNewsInput,
  type NewsFormInput,
  type NewsQuery,
} from "@/schemas/news";
import type { NewsActor, NewsEditValues } from "@/types/news";
import {
  finalizeOrphanedMediaAsset,
  markMediaAssetAttached,
  markMediaAssetOrphaned,
  MediaServiceError,
  requireFreshMediaActor,
  resolvePendingMediaAsset,
} from "@/services/media.service";

const NEWS_PAGE_SIZE = 10;

export class NewsServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "DUPLICATE_SLUG"
      | "INVALID_TAXONOMY"
      | "INVALID_MEDIA",
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "NewsServiceError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function validateTaxonomy(
  categoryId: string | null,
  tagIds: string[],
  existing: {
    categoryId?: string | null;
    tagIds?: string[];
  } = {},
): Promise<void> {
  const existingTagIds = existing.tagIds ?? [];
  const [category, activeTagCount] = await Promise.all([
    categoryId
      ? prisma.category.findFirst({
          where: {
            id: categoryId,
            OR: [
              { isActive: true },
              ...(categoryId === existing.categoryId ? [{ id: categoryId }] : []),
            ],
          },
          select: { id: true },
        })
      : null,
    tagIds.length
      ? prisma.tag.count({
          where: {
            id: { in: tagIds },
            OR: [
              { isActive: true },
              ...(existingTagIds.length
                ? [{ id: { in: existingTagIds } }]
                : []),
            ],
          },
        })
      : 0,
  ]);

  if (categoryId && !category) {
    throw new NewsServiceError(
      "INVALID_TAXONOMY",
      "Select an active category.",
      "categoryId",
    );
  }

  if (activeTagCount !== tagIds.length) {
    throw new NewsServiceError(
      "INVALID_TAXONOMY",
      "One or more selected tags are unavailable.",
      "tagIds",
    );
  }
}

function assertStatusPermission(actor: NewsActor, input: NewsFormInput) {
  if (!canUseNewsStatus(actor.role, input.status)) {
    throw new NewsServiceError(
      "FORBIDDEN",
      "You do not have permission to use the selected status.",
      "status",
    );
  }
}

export async function listNews(query: NewsQuery) {
  const where: Prisma.NewsArticleWhereInput = {
    ...(query.search
      ? { title: { contains: query.search, mode: "insensitive" } }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { categoryId: query.category } : {}),
  };
  const orderBy: Prisma.NewsArticleOrderByWithRelationInput = {
    createdAt: query.sort === "oldest" ? "asc" : "desc",
  };
  const skip = (query.page - 1) * NEWS_PAGE_SIZE;

  const [total, articles] = await prisma.$transaction([
    prisma.newsArticle.count({ where }),
    prisma.newsArticle.findMany({
      where,
      orderBy,
      skip,
      take: NEWS_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        status: true,
        featured: true,
        publishedAt: true,
        updatedAt: true,
        authorId: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  return {
    articles,
    total,
    page: query.page,
    pageSize: NEWS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE)),
  };
}

export async function getNewsFormOptions(
  existing: { categoryId?: string; tagIds?: string[] } = {},
) {
  const existingTagIds = existing.tagIds ?? [];
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: {
        OR: [
          { isActive: true },
          ...(existing.categoryId ? [{ id: existing.categoryId }] : []),
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.tag.findMany({
      where: {
        OR: [
          { isActive: true },
          ...(existingTagIds.length ? [{ id: { in: existingTagIds } }] : []),
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  return { categories, tags };
}

export async function getNewsForEdit(id: string): Promise<NewsEditValues | null> {
  const article = await prisma.newsArticle.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      coverImageAssetId: true,
      coverImageAsset: {
        select: {
          id: true,
          url: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          kind: true,
          status: true,
        },
      },
      coverImageAlt: true,
      categoryId: true,
      status: true,
      featured: true,
      publishedAt: true,
      scheduledFor: true,
      authorId: true,
      tags: { select: { tagId: true } },
    },
  });

  if (!article) {
    return null;
  }

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? "",
    content: article.content,
    coverImageUrl: article.coverImageAssetId ? "" : article.coverImageUrl ?? "",
    coverImageAssetId: article.coverImageAssetId ?? "",
    coverImageAsset: article.coverImageAsset,
    coverImageAlt: article.coverImageAlt ?? "",
    categoryId: article.categoryId ?? "",
    tagIds: article.tags.map((tag) => tag.tagId),
    status: article.status,
    featured: article.featured,
    publishedAt: formatUtcInput(article.publishedAt),
    scheduledFor: formatUtcInput(article.scheduledFor),
    authorId: article.authorId,
  };
}

export async function createNews(actor: NewsActor, input: NewsFormInput) {
  actor = await requireFreshMediaActor(actor);
  if (!canCreateNews(actor.role)) {
    throw new NewsServiceError(
      "FORBIDDEN",
      "You do not have permission to create news.",
    );
  }
  assertStatusPermission(actor, input);

  const normalized = normalizeNewsInput(input);
  await validateTaxonomy(normalized.categoryId, normalized.tagIds);

  try {
    return await prisma.$transaction(async (transaction) => {
      const coverAsset = normalized.coverImageAssetId
        ? await resolvePendingMediaAsset(
            transaction,
            actor,
            normalized.coverImageAssetId,
            MediaAssetKind.NEWS_COVER,
          )
        : null;
      const article = await transaction.newsArticle.create({
        data: {
          title: normalized.title,
          slug: normalized.slug,
          excerpt: normalized.excerpt,
          content: normalized.content,
          coverImageUrl: coverAsset?.url ?? normalized.coverImageUrl,
          coverImageAssetId: coverAsset?.id ?? null,
          coverImageAlt: normalized.coverImageAlt,
          status: normalized.status,
          featured: normalized.featured,
          publishedAt: normalized.publishedAt,
          scheduledFor: normalized.scheduledFor,
          archivedAt: normalized.archivedAt,
          authorId: actor.id,
          categoryId: normalized.categoryId,
          tags: {
            create: normalized.tagIds.map((tagId) => ({ tagId })),
          },
        },
        select: { id: true },
      });

      if (coverAsset) {
        await markMediaAssetAttached(transaction, {
          assetId: coverAsset.id,
          actorId: actor.id,
          entityType: "NewsArticle",
          entityId: article.id,
          slot: "cover",
        });
      }

      return article;
    });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw new NewsServiceError(
        "INVALID_MEDIA",
        error.message,
        "coverImageAssetId",
      );
    }
    if (isUniqueConstraintError(error)) {
      throw new NewsServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function updateNews(
  actor: NewsActor,
  id: string,
  input: NewsFormInput,
) {
  actor = await requireFreshMediaActor(actor);
  const existing = await prisma.newsArticle.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      publishedAt: true,
      archivedAt: true,
      status: true,
      categoryId: true,
      coverImageAssetId: true,
      coverImageAsset: {
        select: {
          id: true,
          url: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          kind: true,
          status: true,
        },
      },
      tags: { select: { tagId: true } },
    },
  });

  if (!existing) {
    throw new NewsServiceError("NOT_FOUND", "News article not found.");
  }
  if (!canEditNews(actor.role, actor.id, existing.authorId)) {
    throw new NewsServiceError(
      "FORBIDDEN",
      "You do not have permission to edit this article.",
    );
  }
  assertStatusPermission(actor, input);

  const normalized = normalizeNewsInput(input, {
    existingPublishedAt: existing.publishedAt,
  });
  await validateTaxonomy(normalized.categoryId, normalized.tagIds, {
    categoryId: existing.categoryId,
    tagIds: existing.tags.map((tag) => tag.tagId),
  });

  try {
    const replacesCover =
      normalized.coverImageAssetId !== existing.coverImageAssetId;
    const article = await prisma.$transaction(async (transaction) => {
      const newCoverAsset =
        replacesCover && normalized.coverImageAssetId
          ? await resolvePendingMediaAsset(
              transaction,
              actor,
              normalized.coverImageAssetId,
              MediaAssetKind.NEWS_COVER,
            )
          : null;
      const retainedCoverAsset = replacesCover
        ? null
        : existing.coverImageAsset;
      const updated = await transaction.newsArticle.update({
        where: { id },
        data: {
          title: normalized.title,
          slug: normalized.slug,
          excerpt: normalized.excerpt,
          content: normalized.content,
          coverImageUrl:
            newCoverAsset?.url ??
            retainedCoverAsset?.url ??
            normalized.coverImageUrl,
          coverImageAssetId:
            newCoverAsset?.id ?? retainedCoverAsset?.id ?? null,
          coverImageAlt: normalized.coverImageAlt,
          status: normalized.status,
          featured: normalized.featured,
          publishedAt: normalized.publishedAt,
          scheduledFor: normalized.scheduledFor,
          archivedAt:
            normalized.status === "ARCHIVED"
              ? existing.archivedAt ?? normalized.archivedAt
              : null,
          categoryId: normalized.categoryId,
          tags: {
            deleteMany: {},
            create: normalized.tagIds.map((tagId) => ({ tagId })),
          },
        },
        select: { id: true },
      });

      if (newCoverAsset) {
        await markMediaAssetAttached(transaction, {
          assetId: newCoverAsset.id,
          actorId: actor.id,
          entityType: "NewsArticle",
          entityId: updated.id,
          slot: "cover",
        });
      }
      if (replacesCover && existing.coverImageAssetId) {
        await markMediaAssetOrphaned(transaction, {
          assetId: existing.coverImageAssetId,
          actorId: actor.id,
          entityType: "NewsArticle",
          entityId: updated.id,
          slot: "cover",
          replacementAssetId: newCoverAsset?.id,
        });
      }

      return updated;
    });
    if (replacesCover && existing.coverImageAssetId) {
      await finalizeOrphanedMediaAsset(existing.coverImageAssetId, {
        actorId: actor.id,
      });
    }
    return article;
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw new NewsServiceError(
        "INVALID_MEDIA",
        error.message,
        "coverImageAssetId",
      );
    }
    if (isUniqueConstraintError(error)) {
      throw new NewsServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function deleteNews(actor: NewsActor, id: string): Promise<void> {
  actor = await requireFreshMediaActor(actor);
  if (!canDeleteNews(actor.role)) {
    throw new NewsServiceError(
      "FORBIDDEN",
      "You do not have permission to delete news.",
    );
  }

  const existing = await prisma.newsArticle.findUnique({
    where: { id },
    select: { id: true, coverImageAssetId: true },
  });
  if (!existing) {
    throw new NewsServiceError("NOT_FOUND", "News article not found.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.newsArticleTag.deleteMany({ where: { newsArticleId: id } });
    await transaction.newsArticle.delete({ where: { id } });
    if (existing.coverImageAssetId) {
      await markMediaAssetOrphaned(transaction, {
        assetId: existing.coverImageAssetId,
        actorId: actor.id,
        entityType: "NewsArticle",
        entityId: id,
        slot: "cover",
      });
    }
  });
  if (existing.coverImageAssetId) {
    await finalizeOrphanedMediaAsset(existing.coverImageAssetId, {
      actorId: actor.id,
    });
  }
}
