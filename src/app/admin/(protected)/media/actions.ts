"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { mediaAssetIdSchema } from "@/schemas/media";
import {
  discardPendingMediaAsset,
  MediaServiceError,
} from "@/services/media.service";
import type { MediaMutationResult } from "@/types/media";

export async function discardPendingMediaAction(
  assetId: string,
): Promise<MediaMutationResult> {
  const user = await requireAdmin();
  const parsedId = mediaAssetIdSchema.safeParse(assetId);
  if (!parsedId.success) {
    return { ok: false, message: "The upload was not found." };
  }

  try {
    await discardPendingMediaAsset(
      { id: user.id, role: user.role },
      parsedId.data,
    );
    return { ok: true };
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "The upload could not be removed. Please try again.",
    };
  }
}
