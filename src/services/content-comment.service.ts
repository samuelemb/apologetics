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
  contentCommentTargetSchema,
} from "@/schemas/content-comment";

export class ContentCommentError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_FOUND" | "INVALID_PARENT" | "NOT_EDITABLE",
    message: string,
  ) {
    super(message);
    this.name = "ContentCommentError";
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
  await assertPublishedContent(parsed.contentType, parsed.contentId);

  if (parsed.parentId) {
    const parent = await prisma.contentComment.findFirst({
      where: { id: parsed.parentId, contentType: parsed.contentType, contentId: parsed.contentId, status: ContentCommentStatus.PUBLISHED },
      select: { id: true },
    });
    if (!parent) throw new ContentCommentError("INVALID_PARENT", "This comment can no longer receive replies.");
  }

  return prisma.contentComment.create({
    data: { authorId: actor.id, contentType: parsed.contentType, contentId: parsed.contentId, parentId: parsed.parentId, body: parsed.body },
    select: { id: true },
  });
}

export async function editContentComment(actor: PublicActor, input: unknown) {
  const parsed = contentCommentEditSchema.parse(input);
  await assertPublicActor(actor);
  const comment = await prisma.contentComment.findUnique({ where: { id: parsed.commentId }, select: { authorId: true, status: true } });
  if (!comment || comment.authorId !== actor.id || comment.status !== ContentCommentStatus.PUBLISHED) {
    throw new ContentCommentError("NOT_EDITABLE", "You cannot edit this comment.");
  }
  return prisma.contentComment.update({ where: { id: parsed.commentId }, data: { body: parsed.body }, select: { id: true } });
}

export async function deleteOwnContentComment(actor: PublicActor, commentId: string) {
  await assertPublicActor(actor);
  const comment = await prisma.contentComment.findUnique({ where: { id: commentId }, select: { authorId: true, status: true } });
  if (!comment || comment.authorId !== actor.id || comment.status !== ContentCommentStatus.PUBLISHED) {
    throw new ContentCommentError("NOT_EDITABLE", "You cannot delete this comment.");
  }
  await prisma.contentComment.update({ where: { id: commentId }, data: { status: ContentCommentStatus.DELETED, body: "", deletedAt: new Date() } });
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
  replies: PublicContentComment[];
};

export async function getPublicContentComments(input: unknown, currentUserId?: string | null): Promise<PublicContentComment[]> {
  const parsed = contentCommentTargetSchema.parse(input);
  const comments = await prisma.contentComment.findMany({
    where: { contentType: parsed.contentType, contentId: parsed.contentId },
    orderBy: { createdAt: "asc" },
    select: { id: true, parentId: true, body: true, status: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } } },
  });
  const byId = new Map<string, PublicContentComment>();
  const roots: PublicContentComment[] = [];
  for (const comment of comments) byId.set(comment.id, { ...comment, isOwner: comment.author.id === currentUserId, replies: [] });
  for (const comment of byId.values()) {
    const parent = comment.parentId ? byId.get(comment.parentId) : undefined;
    if (parent) parent.replies.push(comment); else roots.push(comment);
  }
  return roots;
}

export async function listContentCommentsForModeration(actor: AdminActor) {
  if (!canModerateComments(actor.role)) throw new ContentCommentError("FORBIDDEN", "You do not have permission to moderate comments.");
  return prisma.contentComment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, contentType: true, contentId: true, body: true, status: true, createdAt: true, author: { select: { name: true, email: true } } },
  });
}
