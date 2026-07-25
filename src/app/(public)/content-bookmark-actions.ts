"use server";

import { getCurrentPublicUser } from "@/lib/auth/guards";
import { contentLikeSchema } from "@/schemas/content-like";
import { ContentBookmarkError, toggleContentBookmark } from "@/services/content-bookmark.service";

export async function toggleContentBookmarkAction(input: unknown): Promise<{ ok: true; saved: boolean } | { ok: false; message: string }> {
  const parsed = contentLikeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "This article cannot be saved." };
  const user = await getCurrentPublicUser();
  if (!user) return { ok: false, message: "Sign in to save this article." };
  try {
    return { ok: true, ...(await toggleContentBookmark(user.id, parsed.data)) };
  } catch (error) {
    return { ok: false, message: error instanceof ContentBookmarkError ? error.message : "Unable to update your saved articles." };
  }
}
