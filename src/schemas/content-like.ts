import { z } from "zod";

import { ContentType } from "@/generated/prisma/enums";

export const contentLikeSchema = z.object({
  contentType: z.enum(ContentType),
  contentId: z.string().trim().min(1).max(191),
});

export type ContentLikeInput = z.infer<typeof contentLikeSchema>;
