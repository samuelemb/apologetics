import "server-only";

import { ContentCommentStatus, ContentType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type ActivityKind = "like" | "comment" | "reply";

export type PublicAccountActivity = {
  id: string;
  kind: ActivityKind;
  createdAt: Date;
  title: string | null;
  href: string | null;
  excerpt: string | null;
};

export type PublicAccountOverview = {
  statistics: { likes: number; comments: number; replies: number; notifications: number };
  activities: PublicAccountActivity[];
};

type CandidateActivity = Omit<PublicAccountActivity, "title" | "href"> & {
  contentType: ContentType;
  contentId: string;
};

function contentKey(type: ContentType, id: string) { return `${type}:${id}`; }

export async function getPublicAccountOverview(userId: string): Promise<PublicAccountOverview> {
  const [likes, comments, replies, recentLikes, recentComments] = await prisma.$transaction([
    prisma.contentLike.count({ where: { userId } }),
    prisma.contentComment.count({ where: { authorId: userId, status: ContentCommentStatus.PUBLISHED, parentId: null } }),
    prisma.contentComment.count({ where: { authorId: userId, status: ContentCommentStatus.PUBLISHED, parentId: { not: null } } }),
    prisma.contentLike.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3, select: { contentType: true, contentId: true, createdAt: true } }),
    prisma.contentComment.findMany({ where: { authorId: userId, status: ContentCommentStatus.PUBLISHED }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, parentId: true, contentType: true, contentId: true, body: true, createdAt: true } }),
  ]);

  const candidateActivities: CandidateActivity[] = [
    ...recentLikes.map((like) => ({ id: `like:${contentKey(like.contentType, like.contentId)}`, kind: "like" as const, createdAt: like.createdAt, contentType: like.contentType, contentId: like.contentId, excerpt: null })),
    ...recentComments.map((comment) => ({ id: `comment:${comment.id}`, kind: comment.parentId ? "reply" as const : "comment" as const, createdAt: comment.createdAt, contentType: comment.contentType, contentId: comment.contentId, excerpt: comment.body })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, 3);

  try {
    const idsByType = new Map<ContentType, string[]>();
    for (const activity of candidateActivities) idsByType.set(activity.contentType, [...(idsByType.get(activity.contentType) ?? []), activity.contentId]);
    const [news, events, magazines] = await Promise.all([
      prisma.newsArticle.findMany({ where: { id: { in: idsByType.get(ContentType.NEWS) ?? [] } }, select: { id: true, title: true, slug: true } }),
      prisma.event.findMany({ where: { id: { in: idsByType.get(ContentType.EVENT) ?? [] } }, select: { id: true, title: true, slug: true } }),
      prisma.magazineIssue.findMany({ where: { id: { in: idsByType.get(ContentType.MAGAZINE) ?? [] } }, select: { id: true, title: true, slug: true } }),
    ]);
    const content = new Map<string, { title: string; href: string }>();
    news.forEach((item) => content.set(contentKey(ContentType.NEWS, item.id), { title: item.title, href: `/news/${item.slug}` }));
    events.forEach((item) => content.set(contentKey(ContentType.EVENT, item.id), { title: item.title, href: `/events/${item.slug}` }));
    magazines.forEach((item) => content.set(contentKey(ContentType.MAGAZINE, item.id), { title: item.title, href: `/magazine/${item.slug}` }));
    return { statistics: { likes, comments, replies, notifications: 0 }, activities: candidateActivities.map(({ contentType, contentId, ...activity }) => ({ ...activity, title: content.get(contentKey(contentType, contentId))?.title ?? null, href: content.get(contentKey(contentType, contentId))?.href ?? null })) };
  } catch {
    return { statistics: { likes, comments, replies, notifications: 0 }, activities: [] };
  }
}
