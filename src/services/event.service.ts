import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { CategoryType, MediaAssetKind } from "@/generated/prisma/enums";
import {
  canCreateEvent,
  canDeleteEvent,
  canEditEvent,
  canUseEventStatus,
} from "@/lib/event-policy";
import { prisma } from "@/lib/prisma";
import {
  formatEventUtcInput,
  normalizeEventInput,
  type EventFormInput,
  type EventQuery,
} from "@/schemas/event";
import type { EventActor, EventEditValues } from "@/types/event";
import {
  finalizeOrphanedMediaAsset,
  markMediaAssetAttached,
  markMediaAssetOrphaned,
  MediaServiceError,
  requireFreshMediaActor,
  resolvePendingMediaAsset,
} from "@/services/media.service";

const EVENT_PAGE_SIZE = 10;

export class EventServiceError extends Error {
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
    this.name = "EventServiceError";
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
              {
                isActive: true,
                type: { in: [CategoryType.EVENT, CategoryType.GENERAL] },
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
    throw new EventServiceError(
      "INVALID_TAXONOMY",
      "Select an active Event or General category.",
      "categoryId",
    );
  }
  if (activeTagCount !== tagIds.length) {
    throw new EventServiceError(
      "INVALID_TAXONOMY",
      "One or more selected tags are unavailable.",
      "tagIds",
    );
  }
}

function assertStatusPermission(actor: EventActor, input: EventFormInput) {
  if (!canUseEventStatus(actor.role, input.status)) {
    throw new EventServiceError(
      "FORBIDDEN",
      "You do not have permission to use the selected status.",
      "status",
    );
  }
}

export async function listEvents(query: EventQuery) {
  const where: Prisma.EventWhereInput = {
    ...(query.search
      ? { title: { contains: query.search, mode: "insensitive" } }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { categoryId: query.category } : {}),
    ...(query.mode ? { isOnline: query.mode === "online" } : {}),
  };
  const orderBy: Prisma.EventOrderByWithRelationInput =
    query.sort === "start"
      ? { startAt: "asc" }
      : { createdAt: query.sort === "oldest" ? "asc" : "desc" };
  const skip = (query.page - 1) * EVENT_PAGE_SIZE;

  const [total, events] = await prisma.$transaction([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy,
      skip,
      take: EVENT_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        status: true,
        startAt: true,
        endAt: true,
        location: true,
        isOnline: true,
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
    events,
    total,
    page: query.page,
    pageSize: EVENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / EVENT_PAGE_SIZE)),
  };
}

export async function getEventFormOptions(
  existing: { categoryId?: string; tagIds?: string[] } = {},
) {
  const existingTagIds = existing.tagIds ?? [];
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: {
        OR: [
          {
            isActive: true,
            type: { in: [CategoryType.EVENT, CategoryType.GENERAL] },
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

export async function getEventForEdit(id: string): Promise<EventEditValues | null> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
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
      startAt: true,
      endAt: true,
      location: true,
      isOnline: true,
      onlineUrl: true,
      registrationUrl: true,
      registrationDeadline: true,
      capacity: true,
      publishedAt: true,
      scheduledFor: true,
      authorId: true,
      tags: { select: { tagId: true } },
    },
  });

  if (!event) {
    return null;
  }

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    summary: event.summary ?? "",
    content: event.content,
    coverImageUrl: event.coverImageAssetId ? "" : event.coverImageUrl ?? "",
    coverImageAssetId: event.coverImageAssetId ?? "",
    coverImageAsset: event.coverImageAsset,
    coverImageAlt: event.coverImageAlt ?? "",
    categoryId: event.categoryId ?? "",
    tagIds: event.tags.map((tag) => tag.tagId),
    status: event.status,
    featured: event.featured,
    startAt: formatEventUtcInput(event.startAt),
    endAt: formatEventUtcInput(event.endAt),
    location: event.location ?? "",
    isOnline: event.isOnline,
    onlineUrl: event.onlineUrl ?? "",
    registrationUrl: event.registrationUrl ?? "",
    registrationDeadline: formatEventUtcInput(event.registrationDeadline),
    capacity: event.capacity?.toString() ?? "",
    publishedAt: formatEventUtcInput(event.publishedAt),
    scheduledFor: formatEventUtcInput(event.scheduledFor),
    authorId: event.authorId,
  };
}

export async function createEvent(actor: EventActor, input: EventFormInput) {
  actor = await requireFreshMediaActor(actor);
  if (!canCreateEvent(actor.role)) {
    throw new EventServiceError(
      "FORBIDDEN",
      "You do not have permission to create events.",
    );
  }
  assertStatusPermission(actor, input);

  const normalized = normalizeEventInput(input);
  await validateTaxonomy(normalized.categoryId, normalized.tagIds);

  try {
    return await prisma.$transaction(async (transaction) => {
      const coverAsset = normalized.coverImageAssetId
        ? await resolvePendingMediaAsset(
            transaction,
            actor,
            normalized.coverImageAssetId,
            MediaAssetKind.EVENT_COVER,
          )
        : null;
      const event = await transaction.event.create({
        data: {
          title: normalized.title,
          slug: normalized.slug,
          summary: normalized.summary,
          content: normalized.content,
          coverImageUrl: coverAsset?.url ?? normalized.coverImageUrl,
          coverImageAssetId: coverAsset?.id ?? null,
          coverImageAlt: normalized.coverImageAlt,
          categoryId: normalized.categoryId,
          status: normalized.status,
          featured: normalized.featured,
          startAt: normalized.startAt,
          endAt: normalized.endAt,
          location: normalized.location,
          isOnline: normalized.isOnline,
          onlineUrl: normalized.onlineUrl,
          registrationUrl: normalized.registrationUrl,
          registrationDeadline: normalized.registrationDeadline,
          capacity: normalized.capacity,
          publishedAt: normalized.publishedAt,
          scheduledFor: normalized.scheduledFor,
          authorId: actor.id,
          tags: { create: normalized.tagIds.map((tagId) => ({ tagId })) },
        },
        select: { id: true },
      });
      if (coverAsset) {
        await markMediaAssetAttached(transaction, {
          assetId: coverAsset.id,
          actorId: actor.id,
          entityType: "Event",
          entityId: event.id,
          slot: "cover",
        });
      }
      return event;
    });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw new EventServiceError(
        "INVALID_MEDIA",
        error.message,
        "coverImageAssetId",
      );
    }
    if (isUniqueConstraintError(error)) {
      throw new EventServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function updateEvent(
  actor: EventActor,
  id: string,
  input: EventFormInput,
) {
  actor = await requireFreshMediaActor(actor);
  const existing = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      publishedAt: true,
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
    throw new EventServiceError("NOT_FOUND", "Event not found.");
  }
  if (!canEditEvent(actor.role, actor.id, existing.authorId)) {
    throw new EventServiceError(
      "FORBIDDEN",
      "You do not have permission to edit this event.",
    );
  }
  assertStatusPermission(actor, input);

  const normalized = normalizeEventInput(input, {
    existingPublishedAt: existing.publishedAt,
  });
  await validateTaxonomy(normalized.categoryId, normalized.tagIds, {
    categoryId: existing.categoryId,
    tagIds: existing.tags.map((tag) => tag.tagId),
  });

  try {
    const replacesCover =
      normalized.coverImageAssetId !== existing.coverImageAssetId;
    const event = await prisma.$transaction(async (transaction) => {
      const newCoverAsset =
        replacesCover && normalized.coverImageAssetId
          ? await resolvePendingMediaAsset(
              transaction,
              actor,
              normalized.coverImageAssetId,
              MediaAssetKind.EVENT_COVER,
            )
          : null;
      const retainedCoverAsset = replacesCover
        ? null
        : existing.coverImageAsset;
      const updated = await transaction.event.update({
        where: { id },
        data: {
          title: normalized.title,
          slug: normalized.slug,
          summary: normalized.summary,
          content: normalized.content,
          coverImageUrl:
            newCoverAsset?.url ??
            retainedCoverAsset?.url ??
            normalized.coverImageUrl,
          coverImageAssetId:
            newCoverAsset?.id ?? retainedCoverAsset?.id ?? null,
          coverImageAlt: normalized.coverImageAlt,
          categoryId: normalized.categoryId,
          status: normalized.status,
          featured: normalized.featured,
          startAt: normalized.startAt,
          endAt: normalized.endAt,
          location: normalized.location,
          isOnline: normalized.isOnline,
          onlineUrl: normalized.onlineUrl,
          registrationUrl: normalized.registrationUrl,
          registrationDeadline: normalized.registrationDeadline,
          capacity: normalized.capacity,
          publishedAt: normalized.publishedAt,
          scheduledFor: normalized.scheduledFor,
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
          entityType: "Event",
          entityId: updated.id,
          slot: "cover",
        });
      }
      if (replacesCover && existing.coverImageAssetId) {
        await markMediaAssetOrphaned(transaction, {
          assetId: existing.coverImageAssetId,
          actorId: actor.id,
          entityType: "Event",
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
    return event;
  } catch (error) {
    if (error instanceof MediaServiceError) {
      throw new EventServiceError(
        "INVALID_MEDIA",
        error.message,
        "coverImageAssetId",
      );
    }
    if (isUniqueConstraintError(error)) {
      throw new EventServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function deleteEvent(actor: EventActor, id: string): Promise<void> {
  actor = await requireFreshMediaActor(actor);
  if (!canDeleteEvent(actor.role)) {
    throw new EventServiceError(
      "FORBIDDEN",
      "You do not have permission to delete events.",
    );
  }

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, coverImageAssetId: true },
  });
  if (!existing) {
    throw new EventServiceError("NOT_FOUND", "Event not found.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.eventTag.deleteMany({ where: { eventId: id } });
    await transaction.event.delete({ where: { id } });
    if (existing.coverImageAssetId) {
      await markMediaAssetOrphaned(transaction, {
        assetId: existing.coverImageAssetId,
        actorId: actor.id,
        entityType: "Event",
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
