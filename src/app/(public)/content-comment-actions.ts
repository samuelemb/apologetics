"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPublicUser, requireAdmin } from "@/lib/auth/guards";
import { ContentCommentError, createContentComment, deleteOwnContentComment, editContentComment, getPublicContentCommentReplies, getPublicContentComments, moderateContentComment } from "@/services/content-comment.service";

export type ContentCommentActionResult = { ok: true } | { ok: false; message: string };
type ContentCommentPageActionResult =
  | { ok: true; page: Awaited<ReturnType<typeof getPublicContentComments>> }
  | { ok: false; message: string };

function resultError(error: unknown): ContentCommentActionResult {
  return { ok: false, message: error instanceof ContentCommentError ? error.message : "Unable to update the comment. Please try again." };
}

export async function createContentCommentAction(input: unknown): Promise<ContentCommentActionResult> {
  const user = await getCurrentPublicUser();
  if (!user) return { ok: false, message: "Sign in to comment." };
  try { await createContentComment(user, input); return { ok: true }; } catch (error) { return resultError(error); }
}

export async function editContentCommentAction(input: unknown): Promise<ContentCommentActionResult> {
  const user = await getCurrentPublicUser();
  if (!user) return { ok: false, message: "Sign in to edit comments." };
  try { await editContentComment(user, input); return { ok: true }; } catch (error) { return resultError(error); }
}

export async function deleteOwnContentCommentAction(commentId: string): Promise<ContentCommentActionResult> {
  const user = await getCurrentPublicUser();
  if (!user) return { ok: false, message: "Sign in to delete comments." };
  try { await deleteOwnContentComment(user, commentId); return { ok: true }; } catch (error) { return resultError(error); }
}

export async function loadMoreContentCommentsAction(input: unknown): Promise<ContentCommentPageActionResult> {
  try {
    const user = await getCurrentPublicUser();
    return { ok: true, page: await getPublicContentComments(input, user?.id) };
  } catch (error) {
    return { ok: false, message: error instanceof ContentCommentError ? error.message : "Unable to load comments. Please try again." };
  }
}

export async function loadContentCommentRepliesAction(input: unknown): Promise<ContentCommentPageActionResult> {
  try {
    const user = await getCurrentPublicUser();
    return { ok: true, page: await getPublicContentCommentReplies(input, user?.id) };
  } catch (error) {
    return { ok: false, message: error instanceof ContentCommentError ? error.message : "Unable to load replies. Please try again." };
  }
}

export async function moderateContentCommentAction(commentId: string, action: "hide" | "delete") {
  const admin = await requireAdmin();
  await moderateContentComment(admin, commentId, action);
  revalidatePath("/admin/comments");
}
