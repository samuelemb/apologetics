"use server";

import { getCurrentPublicUser } from "@/lib/auth/guards";
import {
  ContentLikeError,
  toggleContentLike,
} from "@/services/content-like.service";
import { contentLikeSchema } from "@/schemas/content-like";

export type ContentLikeActionResult =
  | { ok: true; liked: boolean; count: number }
  | { ok: false; message: string };

export async function toggleContentLikeAction(
  input: unknown,
): Promise<ContentLikeActionResult> {
  const parsed = contentLikeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "This content cannot be liked." };
  }

  const user = await getCurrentPublicUser();
  if (!user) {
    return { ok: false, message: "Sign in to like this content." };
  }

  try {
    return { ok: true, ...(await toggleContentLike(user.id, parsed.data)) };
  } catch (error) {
    if (error instanceof ContentLikeError) {
      return { ok: false, message: error.message };
    }

    return { ok: false, message: "Unable to update your like. Please try again." };
  }
}
