import { z } from "zod";

import { MediaAssetKind } from "@/generated/prisma/enums";

export const mediaAssetKindSchema = z.enum(MediaAssetKind);
export const mediaAssetIdSchema = z.string().trim().min(1).max(64);
