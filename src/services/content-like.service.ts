import "server-only";

import {
  ContentStatus,
  ContentType,
  EventStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  contentLikeSchema,
  type ContentLikeInput,
} from "@/schemas/content-like";

export class ContentLikeError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "ContentLikeError";
  }
}

async function assertPublishedContent(input: ContentLikeInput): Promise<void> {
  const now = new Date();
  const where = { id: input.contentId };

  const published =
    input.contentType === ContentType.NEWS
      ? await prisma.newsArticle.findFirst({
          where: {
            ...where,
            status: ContentStatus.PUBLISHED,
            publishedAt: { not: null, lte: now },
          },
          select: { id: true },
        })
      : input.contentType === ContentType.EVENT
        ? await prisma.event.findFirst({
            where: {
              ...where,
              status: EventStatus.PUBLISHED,
              publishedAt: { not: null, lte: now },
            },
            select: { id: true },
          })
        : await prisma.magazineIssue.findFirst({
            where: {
              ...where,
              status: ContentStatus.PUBLISHED,
              publicationDate: { not: null, lte: now },
            },
            select: { id: true },
          });

  if (!published) {
    throw new ContentLikeError("NOT_FOUND", "This content is not available.");
  }
}

export async function getContentLikeSummary(
  input: ContentLikeInput,
  userId?: string | null,
) {
  const parsed = contentLikeSchema.parse(input);
  const [count, currentUserLike] = await Promise.all([
    prisma.contentLike.count({
      where: { contentType: parsed.contentType, contentId: parsed.contentId },
    }),
    userId
      ? prisma.contentLike.findUnique({
          where: {
            userId_contentType_contentId: {
              userId,
              contentType: parsed.contentType,
              contentId: parsed.contentId,
            },
          },
          select: { userId: true },
        })
      : Promise.resolve(null),
  ]);

  return { count, liked: Boolean(currentUserLike) };
}

export async function toggleContentLike(
  userId: string,
  input: ContentLikeInput,
) {
  const parsed = contentLikeSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, emailVerifiedAt: true },
  });

  if (
    !user ||
    user.role !== UserRole.USER ||
    user.status !== UserStatus.ACTIVE ||
    !user.emailVerifiedAt
  ) {
    throw new ContentLikeError("FORBIDDEN", "Sign in to like this content.");
  }

  await assertPublishedContent(parsed);

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.contentLike.findUnique({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType: parsed.contentType,
          contentId: parsed.contentId,
        },
      },
      select: { userId: true },
    });

    if (existing) {
      await transaction.contentLike.delete({
        where: {
          userId_contentType_contentId: {
            userId,
            contentType: parsed.contentType,
            contentId: parsed.contentId,
          },
        },
      });
    } else {
      await transaction.contentLike.create({
        data: { userId, contentType: parsed.contentType, contentId: parsed.contentId },
      });
    }

    const count = await transaction.contentLike.count({
      where: { contentType: parsed.contentType, contentId: parsed.contentId },
    });

    return { liked: !existing, count };
  });
}
