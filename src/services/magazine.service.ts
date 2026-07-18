import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { CategoryType, MediaAssetKind } from "@/generated/prisma/enums";
import {
  canCreateMagazine,
  canDeleteMagazine,
  canEditMagazine,
  canUseMagazineStatus,
} from "@/lib/magazine-policy";
import { prisma } from "@/lib/prisma";
import {
  formatMagazineDateInput,
  normalizeMagazineInput,
  type MagazineFormInput,
  type MagazineQuery,
} from "@/schemas/magazine";
import type { MagazineActor, MagazineEditValues } from "@/types/magazine";
import {
  finalizeOrphanedMediaAsset,
  markMediaAssetAttached,
  markMediaAssetOrphaned,
  MediaServiceError,
  requireFreshMediaActor,
  resolvePendingMediaAsset,
} from "@/services/media.service";

const MAGAZINE_PAGE_SIZE = 10;

export class MagazineServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "DUPLICATE_SLUG"
      | "DUPLICATE_ISSUE_NUMBER"
      | "INVALID_TAXONOMY"
      | "INVALID_MEDIA",
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "MagazineServiceError";
  }
}

function uniqueConstraintField(error: unknown): "slug" | "issueNumber" | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "P2002"
  ) {
    return null;
  }

  const tokens: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      tokens.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === "object" && value !== null) {
      Object.entries(value).forEach(([key, nested]) => {
        tokens.push(key);
        visit(nested);
      });
    }
  };
  visit("meta" in error ? error.meta : error);

  if (tokens.some((token) => token.includes("issueNumber"))) {
    return "issueNumber";
  }
  if (tokens.some((token) => token.includes("slug"))) {
    return "slug";
  }
  return null;
}

function duplicateIdentifierError(field: "slug" | "issueNumber") {
  return field === "slug"
    ? new MagazineServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      )
    : new MagazineServiceError(
        "DUPLICATE_ISSUE_NUMBER",
        "This issue number is already in use.",
        "issueNumber",
      );
}

async function validateUniqueIdentifiers(
  slug: string,
  issueNumber: string,
  excludeId?: string,
): Promise<void> {
  const excludesCurrentIssue = excludeId ? { id: { not: excludeId } } : {};
  const [slugConflict, issueNumberConflict] = await Promise.all([
    prisma.magazineIssue.findFirst({
      where: { slug, ...excludesCurrentIssue },
      select: { id: true },
    }),
    prisma.magazineIssue.findFirst({
      where: { issueNumber, ...excludesCurrentIssue },
      select: { id: true },
    }),
  ]);

  if (slugConflict) {
    throw duplicateIdentifierError("slug");
  }
  if (issueNumberConflict) {
    throw duplicateIdentifierError("issueNumber");
  }
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
              {
                isActive: true,
                type: { in: [CategoryType.MAGAZINE, CategoryType.GENERAL] },
              },
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
    throw new MagazineServiceError(
      "INVALID_TAXONOMY",
      "Select an active Magazine or General category.",
      "categoryId",
    );
  }
  if (activeTagCount !== tagIds.length) {
    throw new MagazineServiceError(
      "INVALID_TAXONOMY",
      "One or more selected tags are unavailable.",
      "tagIds",
    );
  }
}

function assertStatusPermission(actor: MagazineActor, input: MagazineFormInput) {
  if (!canUseMagazineStatus(actor.role, input.status)) {
    throw new MagazineServiceError(
      "FORBIDDEN",
      "You do not have permission to use the selected status.",
      "status",
    );
  }
}

export async function listMagazineIssues(query: MagazineQuery) {
  const where: Prisma.MagazineIssueWhereInput = {
    ...(query.search
      ? { title: { contains: query.search, mode: "insensitive" } }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { categoryId: query.category } : {}),
    ...(query.featured ? { featured: query.featured === "true" } : {}),
  };
  const orderBy: Prisma.MagazineIssueOrderByWithRelationInput =
    query.sort === "publication"
      ? { publicationDate: { sort: "desc", nulls: "last" } }
      : { createdAt: query.sort === "oldest" ? "asc" : "desc" };
  const skip = (query.page - 1) * MAGAZINE_PAGE_SIZE;

  const [total, issues] = await prisma.$transaction([
    prisma.magazineIssue.count({ where }),
    prisma.magazineIssue.findMany({
      where,
      orderBy,
      skip,
      take: MAGAZINE_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        issueNumber: true,
        volume: true,
        coverImageUrl: true,
        coverImageAlt: true,
        status: true,
        featured: true,
        publicationDate: true,
        viewCount: true,
        downloadCount: true,
        updatedAt: true,
        authorId: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  return {
    issues,
    total,
    page: query.page,
    pageSize: MAGAZINE_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / MAGAZINE_PAGE_SIZE)),
  };
}

export async function getMagazineFormOptions(
  existing: { categoryId?: string; tagIds?: string[] } = {},
) {
  const existingTagIds = existing.tagIds ?? [];
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: {
        OR: [
          {
            isActive: true,
            type: { in: [CategoryType.MAGAZINE, CategoryType.GENERAL] },
          },
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

export async function getMagazineForEdit(
  id: string,
): Promise<MagazineEditValues | null> {
  const issue = await prisma.magazineIssue.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      issueNumber: true,
      volume: true,
      description: true,
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
      pdfUrl: true,
      pdfAssetId: true,
      pdfAsset: {
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
      pdfFileName: true,
      pdfFileSize: true,
      pageCount: true,
      publicationDate: true,
      categoryId: true,
      status: true,
      featured: true,
      authorId: true,
      tags: { select: { tagId: true } },
    },
  });

  if (!issue) return null;

  return {
    id: issue.id,
    title: issue.title,
    slug: issue.slug,
    issueNumber: issue.issueNumber,
    volume: issue.volume ?? "",
    description: issue.description ?? "",
    coverImageUrl: issue.coverImageAssetId ? "" : issue.coverImageUrl ?? "",
    coverImageAssetId: issue.coverImageAssetId ?? "",
    coverImageAsset: issue.coverImageAsset,
    coverImageAlt: issue.coverImageAlt ?? "",
    pdfUrl: issue.pdfAssetId ? "" : issue.pdfUrl,
    pdfAssetId: issue.pdfAssetId ?? "",
    pdfAsset: issue.pdfAsset,
    pdfFileName: issue.pdfAssetId ? "" : issue.pdfFileName ?? "",
    pdfFileSize: issue.pdfAssetId ? "" : issue.pdfFileSize?.toString() ?? "",
    pageCount: issue.pageCount?.toString() ?? "",
    publicationDate: formatMagazineDateInput(issue.publicationDate),
    categoryId: issue.categoryId ?? "",
    tagIds: issue.tags.map((tag) => tag.tagId),
    status: issue.status,
    featured: issue.featured,
    authorId: issue.authorId,
  };
}

export async function createMagazineIssue(
  actor: MagazineActor,
  input: MagazineFormInput,
) {
  actor = await requireFreshMediaActor(actor);
  if (!canCreateMagazine(actor.role)) {
    throw new MagazineServiceError(
      "FORBIDDEN",
      "You do not have permission to create magazine issues.",
    );
  }
  assertStatusPermission(actor, input);

  const normalized = normalizeMagazineInput(input);
  await Promise.all([
    validateTaxonomy(normalized.categoryId, normalized.tagIds),
    validateUniqueIdentifiers(normalized.slug, normalized.issueNumber),
  ]);

  try {
    return await prisma.$transaction(async (transaction) => {
      const coverAsset = normalized.coverImageAssetId
        ? await resolvePendingMediaAsset(
            transaction,
            actor,
            normalized.coverImageAssetId,
            MediaAssetKind.MAGAZINE_COVER,
          )
        : null;
      const pdfAsset = normalized.pdfAssetId
        ? await resolvePendingMediaAsset(
            transaction,
            actor,
            normalized.pdfAssetId,
            MediaAssetKind.MAGAZINE_PDF,
          )
        : null;
      const issue = await transaction.magazineIssue.create({
        data: {
          title: normalized.title,
          slug: normalized.slug,
          issueNumber: normalized.issueNumber,
          volume: normalized.volume,
          description: normalized.description,
          coverImageUrl: coverAsset?.url ?? normalized.coverImageUrl,
          coverImageAssetId: coverAsset?.id ?? null,
          coverImageAlt: normalized.coverImageAlt,
          pdfUrl: pdfAsset?.url ?? normalized.pdfUrl,
          pdfAssetId: pdfAsset?.id ?? null,
          pdfFileName: pdfAsset?.originalName ?? normalized.pdfFileName,
          pdfFileSize: pdfAsset?.sizeBytes ?? normalized.pdfFileSize,
          pageCount: normalized.pageCount,
          publicationDate: normalized.publicationDate,
          categoryId: normalized.categoryId,
          status: normalized.status,
          featured: normalized.featured,
          authorId: actor.id,
          tags: { create: normalized.tagIds.map((tagId) => ({ tagId })) },
        },
        select: { id: true },
      });
      if (coverAsset) {
        await markMediaAssetAttached(transaction, {
          assetId: coverAsset.id,
          actorId: actor.id,
          entityType: "MagazineIssue",
          entityId: issue.id,
          slot: "cover",
        });
      }
      if (pdfAsset) {
        await markMediaAssetAttached(transaction, {
          assetId: pdfAsset.id,
          actorId: actor.id,
          entityType: "MagazineIssue",
          entityId: issue.id,
          slot: "pdf",
        });
      }
      return issue;
    });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw new MagazineServiceError(
        "INVALID_MEDIA",
        error.message,
        normalized.coverImageAssetId ? "coverImageAssetId" : "pdfAssetId",
      );
    }
    const field = uniqueConstraintField(error);
    if (field) throw duplicateIdentifierError(field);
    throw error;
  }
}

export async function updateMagazineIssue(
  actor: MagazineActor,
  id: string,
  input: MagazineFormInput,
) {
  actor = await requireFreshMediaActor(actor);
  const existing = await prisma.magazineIssue.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
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
      pdfAssetId: true,
      pdfAsset: {
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
    throw new MagazineServiceError("NOT_FOUND", "Magazine issue not found.");
  }
  if (
    !canEditMagazine(
      actor.role,
      actor.id,
      existing.authorId,
      existing.status,
    )
  ) {
    throw new MagazineServiceError(
      "FORBIDDEN",
      "You do not have permission to edit this magazine issue.",
    );
  }
  assertStatusPermission(actor, input);

  const normalized = normalizeMagazineInput(input);
  await Promise.all([
    validateTaxonomy(normalized.categoryId, normalized.tagIds, {
      categoryId: existing.categoryId,
      tagIds: existing.tags.map((tag) => tag.tagId),
    }),
    validateUniqueIdentifiers(normalized.slug, normalized.issueNumber, id),
  ]);

  try {
    const replacesCover =
      normalized.coverImageAssetId !== existing.coverImageAssetId;
    const replacesPdf = normalized.pdfAssetId !== existing.pdfAssetId;
    const issue = await prisma.$transaction(async (transaction) => {
      const newCoverAsset =
        replacesCover && normalized.coverImageAssetId
          ? await resolvePendingMediaAsset(
              transaction,
              actor,
              normalized.coverImageAssetId,
              MediaAssetKind.MAGAZINE_COVER,
            )
          : null;
      const newPdfAsset =
        replacesPdf && normalized.pdfAssetId
          ? await resolvePendingMediaAsset(
              transaction,
              actor,
              normalized.pdfAssetId,
              MediaAssetKind.MAGAZINE_PDF,
            )
          : null;
      const retainedCoverAsset = replacesCover
        ? null
        : existing.coverImageAsset;
      const retainedPdfAsset = replacesPdf ? null : existing.pdfAsset;
      const updated = await transaction.magazineIssue.update({
        where: { id },
        data: {
          title: normalized.title,
          slug: normalized.slug,
          issueNumber: normalized.issueNumber,
          volume: normalized.volume,
          description: normalized.description,
          coverImageUrl:
            newCoverAsset?.url ??
            retainedCoverAsset?.url ??
            normalized.coverImageUrl,
          coverImageAssetId:
            newCoverAsset?.id ?? retainedCoverAsset?.id ?? null,
          coverImageAlt: normalized.coverImageAlt,
          pdfUrl:
            newPdfAsset?.url ?? retainedPdfAsset?.url ?? normalized.pdfUrl,
          pdfAssetId: newPdfAsset?.id ?? retainedPdfAsset?.id ?? null,
          pdfFileName:
            newPdfAsset?.originalName ??
            retainedPdfAsset?.originalName ??
            normalized.pdfFileName,
          pdfFileSize:
            newPdfAsset?.sizeBytes ??
            retainedPdfAsset?.sizeBytes ??
            normalized.pdfFileSize,
          pageCount: normalized.pageCount,
          publicationDate: normalized.publicationDate,
          categoryId: normalized.categoryId,
          status: normalized.status,
          featured: normalized.featured,
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
          entityType: "MagazineIssue",
          entityId: updated.id,
          slot: "cover",
        });
      }
      if (newPdfAsset) {
        await markMediaAssetAttached(transaction, {
          assetId: newPdfAsset.id,
          actorId: actor.id,
          entityType: "MagazineIssue",
          entityId: updated.id,
          slot: "pdf",
        });
      }
      if (replacesCover && existing.coverImageAssetId) {
        await markMediaAssetOrphaned(transaction, {
          assetId: existing.coverImageAssetId,
          actorId: actor.id,
          entityType: "MagazineIssue",
          entityId: updated.id,
          slot: "cover",
          replacementAssetId: newCoverAsset?.id,
        });
      }
      if (replacesPdf && existing.pdfAssetId) {
        await markMediaAssetOrphaned(transaction, {
          assetId: existing.pdfAssetId,
          actorId: actor.id,
          entityType: "MagazineIssue",
          entityId: updated.id,
          slot: "pdf",
          replacementAssetId: newPdfAsset?.id,
        });
      }
      return updated;
    });
    const orphanedAssetIds = [
      replacesCover ? existing.coverImageAssetId : null,
      replacesPdf ? existing.pdfAssetId : null,
    ].filter((assetId): assetId is string => Boolean(assetId));
    await Promise.all(
      orphanedAssetIds.map((assetId) =>
        finalizeOrphanedMediaAsset(assetId, { actorId: actor.id }),
      ),
    );
    return issue;
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw new MagazineServiceError(
        "INVALID_MEDIA",
        error.message,
        normalized.coverImageAssetId ? "coverImageAssetId" : "pdfAssetId",
      );
    }
    const field = uniqueConstraintField(error);
    if (field) throw duplicateIdentifierError(field);
    throw error;
  }
}

export async function deleteMagazineIssue(
  actor: MagazineActor,
  id: string,
): Promise<void> {
  actor = await requireFreshMediaActor(actor);
  if (!canDeleteMagazine(actor.role)) {
    throw new MagazineServiceError(
      "FORBIDDEN",
      "You do not have permission to delete magazine issues.",
    );
  }

  const existing = await prisma.magazineIssue.findUnique({
    where: { id },
    select: { id: true, coverImageAssetId: true, pdfAssetId: true },
  });
  if (!existing) {
    throw new MagazineServiceError("NOT_FOUND", "Magazine issue not found.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.magazineIssueTag.deleteMany({ where: { magazineIssueId: id } });
    await transaction.magazineIssue.delete({ where: { id } });
    if (existing.coverImageAssetId) {
      await markMediaAssetOrphaned(transaction, {
        assetId: existing.coverImageAssetId,
        actorId: actor.id,
        entityType: "MagazineIssue",
        entityId: id,
        slot: "cover",
      });
    }
    if (existing.pdfAssetId) {
      await markMediaAssetOrphaned(transaction, {
        assetId: existing.pdfAssetId,
        actorId: actor.id,
        entityType: "MagazineIssue",
        entityId: id,
        slot: "pdf",
      });
    }
  });
  await Promise.all(
    [existing.coverImageAssetId, existing.pdfAssetId]
      .filter((assetId): assetId is string => Boolean(assetId))
      .map((assetId) =>
        finalizeOrphanedMediaAsset(assetId, { actorId: actor.id }),
      ),
  );
}
