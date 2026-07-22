import "server-only";

import {
  ContentCommentStatus,
  ContentStatus,
  ContentType,
  EventStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { canModerateComments } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import {
  contentCommentCreateSchema,
  contentCommentEditSchema,
  contentCommentPageSchema,
  contentCommentTargetSchema,
} from "@/schemas/content-comment";

const COMMENTS_PAGE_SIZE = 20;
const COMMENT_ACTION_WINDOW_MS = 60_000;

export class ContentCommentError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_FOUND" | "INVALID_PARENT" | "NOT_EDITABLE" | "RATE_LIMITED",
    message: string,
  ) {
    super(message);
    this.name = "ContentCommentError";
  }
}

async function assertCommentRateLimit(userId: string, action: string, maximum: number) {
  const count = await prisma.auditLog.count({
    where: { userId, action, createdAt: { gte: new Date(Date.now() - COMMENT_ACTION_WINDOW_MS) } },
  });
  if (count >= maximum) {
    throw new ContentCommentError("RATE_LIMITED", "Too many requests. Please wait a moment.");
  }
}

type PublicActor = { id: string };
type AdminActor = { id: string; role: UserRole };

async function assertPublicActor(actor: PublicActor) {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { role: true, status: true, emailVerifiedAt: true },
  });
  if (!user || user.role !== UserRole.USER || user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt) {
    throw new ContentCommentError("FORBIDDEN", "Sign in to comment.");
  }
}

async function assertPublishedContent(contentType: ContentType, contentId: string) {
  const now = new Date();
  const published = contentType === ContentType.NEWS
    ? await prisma.newsArticle.findFirst({ where: { id: contentId, status: ContentStatus.PUBLISHED, publishedAt: { not: null, lte: now } }, select: { id: true } })
    : contentType === ContentType.EVENT
      ? await prisma.event.findFirst({ where: { id: contentId, status: EventStatus.PUBLISHED, publishedAt: { not: null, lte: now } }, select: { id: true } })
      : await prisma.magazineIssue.findFirst({ where: { id: contentId, status: ContentStatus.PUBLISHED, publicationDate: { not: null, lte: now } }, select: { id: true } });
  if (!published) throw new ContentCommentError("NOT_FOUND", "This content is not available.");
}

export async function createContentComment(actor: PublicActor, input: unknown) {
  const parsed = contentCommentCreateSchema.parse(input);
  await assertPublicActor(actor);
  await assertCommentRateLimit(actor.id, "COMMENT_CREATED", 5);
  await assertPublishedContent(parsed.contentType, parsed.contentId);

  if (parsed.parentId) {
    const parent = await prisma.contentComment.findFirst({
      where: { id: parsed.parentId, contentType: parsed.contentType, contentId: parsed.contentId, status: ContentCommentStatus.PUBLISHED },
      select: { id: true },
    });
    if (!parent) throw new ContentCommentError("INVALID_PARENT", "This comment can no longer receive replies.");
  }

  return prisma.$transaction(async (transaction) => {
    const comment = await transaction.contentComment.create({
      data: { authorId: actor.id, contentType: parsed.contentType, contentId: parsed.contentId, parentId: parsed.parentId, body: parsed.body },
      select: { id: true },
    });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "COMMENT_CREATED", entityType: "ContentComment", entityId: comment.id } });
    return comment;
  });
}

export async function editContentComment(actor: PublicActor, input: unknown) {
  const parsed = contentCommentEditSchema.parse(input);
  await assertPublicActor(actor);
  await assertCommentRateLimit(actor.id, "COMMENT_EDITED", 10);
  const comment = await prisma.contentComment.findUnique({ where: { id: parsed.commentId }, select: { authorId: true, status: true } });
  if (!comment || comment.authorId !== actor.id || comment.status !== ContentCommentStatus.PUBLISHED) {
    throw new ContentCommentError("NOT_EDITABLE", "You cannot edit this comment.");
  }
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.contentComment.update({ where: { id: parsed.commentId }, data: { body: parsed.body }, select: { id: true } });
    await transaction.auditLog.create({ data: { userId: actor.id, action: "COMMENT_EDITED", entityType: "ContentComment", entityId: updated.id } });
    return updated;
  });
}

export async function deleteOwnContentComment(actor: PublicActor, commentId: string) {
  await assertPublicActor(actor);
  await assertCommentRateLimit(actor.id, "COMMENT_DELETED_BY_USER", 10);
  const comment = await prisma.contentComment.findUnique({ where: { id: commentId }, select: { authorId: true, status: true } });
  if (!comment || comment.authorId !== actor.id || comment.status !== ContentCommentStatus.PUBLISHED) {
    throw new ContentCommentError("NOT_EDITABLE", "You cannot delete this comment.");
  }
  await prisma.$transaction([
    prisma.contentComment.update({ where: { id: commentId }, data: { status: ContentCommentStatus.DELETED, body: "", deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { userId: actor.id, action: "COMMENT_DELETED_BY_USER", entityType: "ContentComment", entityId: commentId } }),
  ]);
}

export async function moderateContentComment(actor: AdminActor, commentId: string, action: "hide" | "delete") {
  if (!canModerateComments(actor.role)) throw new ContentCommentError("FORBIDDEN", "You do not have permission to moderate comments.");
  const comment = await prisma.contentComment.findUnique({ where: { id: commentId }, select: { id: true, status: true } });
  if (!comment) throw new ContentCommentError("NOT_FOUND", "Comment not found.");
  await prisma.$transaction([
    prisma.contentComment.update({ where: { id: commentId }, data: action === "hide" ? { status: ContentCommentStatus.HIDDEN } : { status: ContentCommentStatus.DELETED, body: "", deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { userId: actor.id, action: action === "hide" ? "COMMENT_HIDDEN" : "COMMENT_DELETED", entityType: "ContentComment", entityId: commentId } }),
  ]);
}

export type PublicContentComment = {
  id: string;
  parentId: string | null;
  body: string;
  status: ContentCommentStatus;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
  isOwner: boolean;
  replyCount: number;
};

type PublicContentCommentPage = { comments: PublicContentComment[]; nextCursor: string | null; totalCount: number };

async function getCommentPage(input: unknown, currentUserId?: string | null): Promise<PublicContentCommentPage> {
  const parsed = contentCommentPageSchema.parse(input);
  const where = { contentType: parsed.contentType, contentId: parsed.contentId, parentId: parsed.parentId ?? null };
  const [comments, totalCount] = await Promise.all([
    prisma.contentComment.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: COMMENTS_PAGE_SIZE + 1,
      ...(parsed.cursor ? { cursor: { id: parsed.cursor }, skip: 1 } : {}),
      select: { id: true, parentId: true, body: true, status: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } }, _count: { select: { replies: true } } },
    }),
    prisma.contentComment.count({ where }),
  ]);
  const hasMore = comments.length > COMMENTS_PAGE_SIZE;
  const visible = hasMore ? comments.slice(0, COMMENTS_PAGE_SIZE) : comments;
  return {
    comments: visible.map(({ _count, ...comment }) => ({ ...comment, isOwner: comment.author.id === currentUserId, replyCount: _count.replies })),
    nextCursor: hasMore ? visible.at(-1)?.id ?? null : null,
    totalCount,
  };
}

export async function getPublicContentComments(input: unknown, currentUserId?: string | null) {
  return getCommentPage(input, currentUserId);
}

export async function getPublicContentCommentReplies(input: unknown, currentUserId?: string | null) {
  const parsed = contentCommentPageSchema.parse(input);
  if (!parsed.parentId) throw new ContentCommentError("NOT_FOUND", "Comment not found.");
  const parent = await prisma.contentComment.findFirst({ where: { id: parsed.parentId, contentType: parsed.contentType, contentId: parsed.contentId }, select: { id: true } });
  if (!parent) throw new ContentCommentError("NOT_FOUND", "Comment not found.");
  return getCommentPage(parsed, currentUserId);
}

export async function listContentCommentsForModeration(actor: AdminActor) {
  if (!canModerateComments(actor.role)) throw new ContentCommentError("FORBIDDEN", "You do not have permission to moderate comments.");
  return prisma.contentComment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, contentType: true, contentId: true, body: true, status: true, createdAt: true, author: { select: { name: true, email: true } } },
  });
}
