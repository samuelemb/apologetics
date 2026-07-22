import { z } from "zod";

import { ContentType } from "@/generated/prisma/enums";

export const contentCommentTargetSchema = z.object({
  contentType: z.enum(ContentType),
  contentId: z.string().trim().min(1).max(191),
});

export const contentCommentCreateSchema = contentCommentTargetSchema.extend({
  parentId: z.string().trim().min(1).max(191).optional(),
  body: z.string().trim().min(1, "Comment cannot be empty.").max(2_000, "Comments must be 2,000 characters or fewer."),
});

export const contentCommentEditSchema = z.object({
  commentId: z.string().trim().min(1).max(191),
  body: z.string().trim().min(1, "Comment cannot be empty.").max(2_000, "Comments must be 2,000 characters or fewer."),
});
