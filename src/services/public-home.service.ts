import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ContentStatus, EventStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const newsSelect = {
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

const eventSelect = {
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

const magazineSelect = {
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
  pdfFileName: true,
  pdfFileSize: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.MagazineIssueSelect;

export async function getPublicHomeData() {
  const now = new Date();
  const publishedNewsWhere = {
    status: ContentStatus.PUBLISHED,
    publishedAt: { lte: now },
  } satisfies Prisma.NewsArticleWhereInput;

  const [featuredNews, upcomingEvents, latestMagazine] = await Promise.all([
    prisma.newsArticle.findFirst({
      where: publishedNewsWhere,
      orderBy: [
        { featured: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      select: newsSelect,
    }),
    prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        publishedAt: { lte: now },
        startAt: { gte: now },
      },
      orderBy: { startAt: "asc" },
      take: 3,
      select: eventSelect,
    }),
    prisma.magazineIssue.findFirst({
      where: {
        status: ContentStatus.PUBLISHED,
      },
      orderBy: [
        { publicationDate: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      select: magazineSelect,
    }),
  ]);

  const latestNews = await prisma.newsArticle.findMany({
    where: {
      ...publishedNewsWhere,
      ...(featuredNews ? { id: { not: featuredNews.id } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: newsSelect,
  });

  return {
    featuredNews,
    latestNews,
    upcomingEvents,
    latestMagazine,
  };
}
