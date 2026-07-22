"use server";

import { revalidatePath } from "next/cache";

import { getCurrentPublicUser, requireAdmin } from "@/lib/auth/guards";
import { ContentCommentError, createContentComment, deleteOwnContentComment, editContentComment, moderateContentComment } from "@/services/content-comment.service";

export type ContentCommentActionResult = { ok: true } | { ok: false; message: string };

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

export async function moderateContentCommentAction(commentId: string, action: "hide" | "delete") {
  const admin = await requireAdmin();
  await moderateContentComment(admin, commentId, action);
  revalidatePath("/admin/comments");
}
