import "server-only";

import {
  ContentCommentStatus,
  ContentType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type ContentEngagementSummary = {
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

export async function attachContentEngagement<T extends { id: string }>(
  contentType: ContentType,
  items: T[],
  currentUserId?: string | null,
): Promise<Array<T & ContentEngagementSummary>> {
  const contentIds = items.map((item) => item.id);

  if (contentIds.length === 0) {
    return [];
  }

  const [likeGroups, commentGroups, currentUserLikes] = await Promise.all([
    prisma.contentLike.groupBy({
      by: ["contentId"],
      where: { contentType, contentId: { in: contentIds } },
      _count: { _all: true },
    }),
    prisma.contentComment.groupBy({
      by: ["contentId"],
      where: {
        contentType,
        contentId: { in: contentIds },
        status: ContentCommentStatus.PUBLISHED,
      },
      _count: { _all: true },
    }),
    currentUserId
      ? prisma.contentLike.findMany({
          where: { userId: currentUserId, contentType, contentId: { in: contentIds } },
          select: { contentId: true },
        })
      : Promise.resolve([]),
  ]);

  const likeCounts = new Map(
    likeGroups.map((group) => [group.contentId, group._count._all]),
  );
  const commentCounts = new Map(
    commentGroups.map((group) => [group.contentId, group._count._all]),
  );
  const likedIds = new Set(currentUserLikes.map((like) => like.contentId));

  return items.map((item) => ({
    ...item,
    likeCount: likeCounts.get(item.id) ?? 0,
    commentCount: commentCounts.get(item.id) ?? 0,
    liked: likedIds.has(item.id),
  }));
}
