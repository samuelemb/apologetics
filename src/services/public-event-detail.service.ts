import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { EventStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const publicEventDetailSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  content: true,
  coverImageUrl: true,
  coverImageAlt: true,
  location: true,
  isOnline: true,
  onlineUrl: true,
  registrationUrl: true,
  startAt: true,
  endAt: true,
  registrationDeadline: true,
  capacity: true,
  publishedAt: true,
  updatedAt: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  tags: {
    where: {
      tag: {
        isActive: true,
      },
    },
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
} satisfies Prisma.EventSelect;

const relatedPublicEventSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  coverImageUrl: true,
  coverImageAlt: true,
  startAt: true,
  endAt: true,
  isOnline: true,
  location: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.EventSelect;

type SelectedPublicEventDetail = Prisma.EventGetPayload<{
  select: typeof publicEventDetailSelect;
}>;

export type PublicEventDetail = Omit<SelectedPublicEventDetail, "tags"> & {
  tags: Array<{
    name: string;
    slug: string;
  }>;
};

export type RelatedPublicEvent = Prisma.EventGetPayload<{
  select: typeof relatedPublicEventSelect;
}>;

export type GetRelatedPublicEventsInput = Pick<
  PublicEventDetail,
  "id" | "category" | "tags"
>;

async function queryPublicEventBySlug(
  slug: string,
): Promise<PublicEventDetail | null> {
  const now = new Date();
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const event = await prisma.event.findFirst({
    where: {
      slug: normalizedSlug,
      status: EventStatus.PUBLISHED,
      publishedAt: {
        not: null,
        lte: now,
      },
    },
    select: publicEventDetailSelect,
  });

  if (!event) {
    return null;
  }

  return {
    ...event,
    tags: event.tags.map(({ tag }) => tag),
  };
}

export const getPublicEventBySlug = cache(queryPublicEventBySlug);

const RELATED_EVENT_LIMIT = 3;

export async function getRelatedPublicEvents(
  currentEvent: GetRelatedPublicEventsInput,
): Promise<RelatedPublicEvent[]> {
  const currentEventId = currentEvent.id.trim();

  if (!currentEventId) {
    return [];
  }

  const categorySlug = currentEvent.category?.slug.trim() || null;
  const tagSlugs = Array.from(
    new Set(
      currentEvent.tags
        .map((tag) => tag.slug.trim())
        .filter((tagSlug) => tagSlug.length > 0),
    ),
  );
  const now = new Date();
  const selectedEvents: RelatedPublicEvent[] = [];
  const excludedIds = new Set([currentEventId]);
  const publicationWhere = {
    status: EventStatus.PUBLISHED,
    publishedAt: {
      not: null,
      lte: now,
    },
  } satisfies Prisma.EventWhereInput;

  async function appendPeriod(
    extraWhere: Prisma.EventWhereInput,
    period: "current" | "past",
  ) {
    const remaining = RELATED_EVENT_LIMIT - selectedEvents.length;

    if (remaining <= 0) {
      return;
    }

    const periodWhere: Prisma.EventWhereInput =
      period === "current"
        ? {
            OR: [
              { endAt: { gte: now } },
              { endAt: null, startAt: { gte: now } },
            ],
          }
        : {
            OR: [
              { endAt: { lt: now } },
              { endAt: null, startAt: { lt: now } },
            ],
          };

    const events = await prisma.event.findMany({
      where: {
        ...publicationWhere,
        ...extraWhere,
        ...periodWhere,
        id: {
          notIn: Array.from(excludedIds),
        },
      },
      orderBy:
        period === "current"
          ? [{ startAt: "asc" }, { id: "asc" }]
          : [{ startAt: "desc" }, { id: "desc" }],
      take: remaining,
      select: relatedPublicEventSelect,
    });

    for (const event of events) {
      if (!excludedIds.has(event.id)) {
        excludedIds.add(event.id);
        selectedEvents.push(event);
      }
    }
  }

  async function appendPriority(extraWhere: Prisma.EventWhereInput) {
    await appendPeriod(extraWhere, "current");
    await appendPeriod(extraWhere, "past");
  }

  if (categorySlug) {
    await appendPriority({
      category: {
        is: {
          slug: categorySlug,
        },
      },
    });
  }

  if (tagSlugs.length > 0 && selectedEvents.length < RELATED_EVENT_LIMIT) {
    await appendPriority({
      tags: {
        some: {
          tag: {
            isActive: true,
            slug: {
              in: tagSlugs,
            },
          },
        },
      },
    });
  }

  if (selectedEvents.length < RELATED_EVENT_LIMIT) {
    await appendPriority({});
  }

  return selectedEvents;
}
