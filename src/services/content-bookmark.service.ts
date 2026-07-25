import "server-only";

import { ContentStatus, ContentType, UserRole, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { contentLikeSchema, type ContentLikeInput } from "@/schemas/content-like";

export class ContentBookmarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentBookmarkError";
  }
}

async function assertPublishedArticle(input: ContentLikeInput) {
  if (input.contentType !== ContentType.NEWS) throw new ContentBookmarkError("This content cannot be saved.");
  const article = await prisma.newsArticle.findFirst({
    where: { id: input.contentId, status: ContentStatus.PUBLISHED, publishedAt: { not: null, lte: new Date() } },
    select: { id: true },
  });
  if (!article) throw new ContentBookmarkError("This article is not available.");
}

export async function getContentBookmarkSummary(input: ContentLikeInput, userId?: string | null) {
  const parsed = contentLikeSchema.parse(input);
  if (!userId) return { saved: false };
  const bookmark = await prisma.contentBookmark.findUnique({
    where: { userId_contentType_contentId: { userId, contentType: parsed.contentType, contentId: parsed.contentId } },
    select: { userId: true },
  });
  return { saved: Boolean(bookmark) };
}

export async function toggleContentBookmark(userId: string, input: ContentLikeInput) {
  const parsed = contentLikeSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, status: true, emailVerifiedAt: true } });
  if (!user || user.role !== UserRole.USER || user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt) {
    throw new ContentBookmarkError("Sign in to save this article.");
  }
  await assertPublishedArticle(parsed);
  return prisma.$transaction(async (transaction) => {
    const key = { userId_contentType_contentId: { userId, contentType: parsed.contentType, contentId: parsed.contentId } };
    const existing = await transaction.contentBookmark.findUnique({ where: key, select: { userId: true } });
    if (existing) await transaction.contentBookmark.delete({ where: key });
    else await transaction.contentBookmark.create({ data: { userId, contentType: parsed.contentType, contentId: parsed.contentId } });
    await transaction.auditLog.create({ data: { userId, action: "CONTENT_BOOKMARK_TOGGLED", entityType: "Content", entityId: `${parsed.contentType}:${parsed.contentId}` } });
    return { saved: !existing };
  });
}
