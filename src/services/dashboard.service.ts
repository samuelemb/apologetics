import "server-only";

import { ContentStatus, EventStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function getDashboardCounts() {
  const [
    newsArticles,
    events,
    magazineIssues,
    draftNews,
    draftEvents,
    draftMagazines,
    publishedNews,
    publishedEvents,
    publishedMagazines,
    contactMessages,
    subscribers,
  ] = await Promise.all([
    prisma.newsArticle.count(),
    prisma.event.count(),
    prisma.magazineIssue.count(),
    prisma.newsArticle.count({ where: { status: ContentStatus.DRAFT } }),
    prisma.event.count({ where: { status: EventStatus.DRAFT } }),
    prisma.magazineIssue.count({ where: { status: ContentStatus.DRAFT } }),
    prisma.newsArticle.count({ where: { status: ContentStatus.PUBLISHED } }),
    prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
    prisma.magazineIssue.count({
      where: { status: ContentStatus.PUBLISHED },
    }),
    prisma.contactMessage.count(),
    prisma.subscriber.count(),
  ]);

  return {
    newsArticles,
    events,
    magazineIssues,
    draftContent: draftNews + draftEvents + draftMagazines,
    publishedContent: publishedNews + publishedEvents + publishedMagazines,
    contactMessages,
    subscribers,
  };
}

