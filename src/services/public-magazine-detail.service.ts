import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { ContentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const publicMagazineIssueDetailSelect = {
  id: true,
  title: true,
  slug: true,
  issueNumber: true,
  volume: true,
  description: true,
  coverImageUrl: true,
  coverImageAlt: true,
  pdfUrl: true,
  pdfFileName: true,
  pdfFileSize: true,
  pageCount: true,
  publicationDate: true,
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
} satisfies Prisma.MagazineIssueSelect;

const relatedPublicMagazineIssueSelect = {
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

type SelectedPublicMagazineIssueDetail =
  Prisma.MagazineIssueGetPayload<{
    select: typeof publicMagazineIssueDetailSelect;
  }>;

export type PublicMagazineIssueDetail = Omit<
  SelectedPublicMagazineIssueDetail,
  "tags"
> & {
  tags: Array<{
    name: string;
    slug: string;
  }>;
};

export type RelatedPublicMagazineIssue =
  Prisma.MagazineIssueGetPayload<{
    select: typeof relatedPublicMagazineIssueSelect;
  }>;

export type GetRelatedPublicMagazineIssuesInput = Pick<
  PublicMagazineIssueDetail,
  "id" | "category" | "tags"
>;

async function queryPublicMagazineIssueBySlug(
  slug: string,
): Promise<PublicMagazineIssueDetail | null> {
  const now = new Date();
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const issue = await prisma.magazineIssue.findFirst({
    where: {
      slug: normalizedSlug,
      status: ContentStatus.PUBLISHED,
      publicationDate: {
        not: null,
        lte: now,
      },
    },
    select: publicMagazineIssueDetailSelect,
  });

  if (!issue) {
    return null;
  }

  return {
    ...issue,
    tags: issue.tags.map(({ tag }) => tag),
  };
}

export const getPublicMagazineIssueBySlug = cache(
  queryPublicMagazineIssueBySlug,
);

const RELATED_MAGAZINE_LIMIT = 3;

export async function getRelatedPublicMagazineIssues(
  currentIssue: GetRelatedPublicMagazineIssuesInput,
): Promise<RelatedPublicMagazineIssue[]> {
  const now = new Date();
  const currentIssueId = currentIssue.id.trim();

  if (!currentIssueId) {
    return [];
  }

  const categorySlug = currentIssue.category?.slug.trim() || null;
  const tagSlugs = Array.from(
    new Set(
      currentIssue.tags
        .map((tag) => tag.slug.trim())
        .filter((tagSlug) => tagSlug.length > 0),
    ),
  );
  const selectedIssues: RelatedPublicMagazineIssue[] = [];
  const excludedIds = new Set([currentIssueId]);
  const publicationWhere = {
    status: ContentStatus.PUBLISHED,
    publicationDate: {
      not: null,
      lte: now,
    },
  } satisfies Prisma.MagazineIssueWhereInput;

  async function appendIssues(extraWhere: Prisma.MagazineIssueWhereInput) {
    const remaining = RELATED_MAGAZINE_LIMIT - selectedIssues.length;

    if (remaining <= 0) {
      return;
    }

    const issues = await prisma.magazineIssue.findMany({
      where: {
        ...publicationWhere,
        ...extraWhere,
        id: {
          notIn: Array.from(excludedIds),
        },
      },
      orderBy: [{ publicationDate: "desc" }, { id: "desc" }],
      take: remaining,
      select: relatedPublicMagazineIssueSelect,
    });

    for (const issue of issues) {
      if (!excludedIds.has(issue.id)) {
        excludedIds.add(issue.id);
        selectedIssues.push(issue);
      }
    }
  }

  if (categorySlug) {
    await appendIssues({
      category: {
        is: {
          slug: categorySlug,
        },
      },
    });
  }

  if (
    tagSlugs.length > 0 &&
    selectedIssues.length < RELATED_MAGAZINE_LIMIT
  ) {
    await appendIssues({
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

  if (selectedIssues.length < RELATED_MAGAZINE_LIMIT) {
    await appendIssues({});
  }

  return selectedIssues;
}
