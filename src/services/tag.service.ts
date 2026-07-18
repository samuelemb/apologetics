import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canAccessTagAdmin,
  canCreateTag,
  canDeleteTag,
  canEditTag,
  canSetTagActive,
} from "@/lib/tag-policy";
import {
  normalizeTagInput,
  type TagFormInput,
  type TagQuery,
} from "@/schemas/tag";
import type { TagActor, TagEditValues } from "@/types/tag";

const TAG_PAGE_SIZE = 10;

export class TagServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "DUPLICATE_SLUG"
      | "REFERENCED",
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "TagServiceError";
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

function assertAccess(actor: TagActor): void {
  if (!canAccessTagAdmin(actor.role)) {
    throw new TagServiceError(
      "FORBIDDEN",
      "You do not have permission to manage tags.",
    );
  }
}

export async function listTags(actor: TagActor, query: TagQuery) {
  assertAccess(actor);

  const unusedRelations: Prisma.TagWhereInput = {
    newsArticles: { none: {} },
    events: { none: {} },
    magazineIssues: { none: {} },
  };
  const usedRelations: Prisma.TagWhereInput = {
    OR: [
      { newsArticles: { some: {} } },
      { events: { some: {} } },
      { magazineIssues: { some: {} } },
    ],
  };
  const filters: Prisma.TagWhereInput[] = [];
  if (query.search) {
    filters.push({
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }
  if (query.active) filters.push({ isActive: query.active === "true" });
  if (query.usage === "used") filters.push(usedRelations);
  if (query.usage === "unused") filters.push(unusedRelations);
  const where: Prisma.TagWhereInput = { AND: filters };
  const orderBy: Prisma.TagOrderByWithRelationInput =
    query.sort === "alphabetical"
      ? { name: "asc" }
      : { createdAt: query.sort === "oldest" ? "asc" : "desc" };
  const skip = (query.page - 1) * TAG_PAGE_SIZE;

  const [total, tags] = await prisma.$transaction([
    prisma.tag.count({ where }),
    prisma.tag.findMany({
      where,
      orderBy,
      skip,
      take: TAG_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            newsArticles: true,
            events: true,
            magazineIssues: true,
          },
        },
      },
    }),
  ]);

  return {
    tags,
    total,
    page: query.page,
    pageSize: TAG_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / TAG_PAGE_SIZE)),
  };
}

export async function getTagForEdit(
  actor: TagActor,
  id: string,
): Promise<TagEditValues | null> {
  assertAccess(actor);
  const tag = await prisma.tag.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
    },
  });

  return tag ? { ...tag, description: tag.description ?? "" } : null;
}

export async function createTag(actor: TagActor, input: TagFormInput) {
  if (!canCreateTag(actor.role)) {
    assertAccess(actor);
  }

  try {
    return await prisma.tag.create({
      data: normalizeTagInput(input),
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new TagServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function updateTag(
  actor: TagActor,
  id: string,
  input: TagFormInput,
) {
  if (!canEditTag(actor.role)) {
    assertAccess(actor);
  }
  const existing = await prisma.tag.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new TagServiceError("NOT_FOUND", "Tag not found.");
  }

  try {
    return await prisma.tag.update({
      where: { id },
      data: normalizeTagInput(input),
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new TagServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function setTagActive(
  actor: TagActor,
  id: string,
  isActive: boolean,
): Promise<void> {
  if (!canSetTagActive(actor.role)) {
    assertAccess(actor);
  }
  const updated = await prisma.tag.updateMany({
    where: { id },
    data: { isActive },
  });
  if (!updated.count) {
    throw new TagServiceError("NOT_FOUND", "Tag not found.");
  }
}

export async function deleteTag(actor: TagActor, id: string): Promise<void> {
  if (!canDeleteTag(actor.role)) {
    throw new TagServiceError(
      "FORBIDDEN",
      "You do not have permission to permanently delete tags.",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      const tag = await transaction.tag.findUnique({
        where: { id },
        select: {
          id: true,
          _count: {
            select: {
              newsArticles: true,
              events: true,
              magazineIssues: true,
            },
          },
        },
      });
      if (!tag) {
        throw new TagServiceError("NOT_FOUND", "Tag not found.");
      }

      const usage =
        tag._count.newsArticles +
        tag._count.events +
        tag._count.magazineIssues;
      if (usage > 0) {
        throw new TagServiceError(
          "REFERENCED",
          "This tag is in use. Deactivate it instead of deleting it.",
        );
      }

      await transaction.tag.delete({ where: { id } });
    },
    { isolationLevel: "Serializable" },
  );
}
