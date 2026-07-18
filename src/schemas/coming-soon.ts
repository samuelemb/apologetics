import { z } from "zod";

import { COMING_SOON_FEATURE_KEYS } from "@/config/coming-soon";

function normalizeFeature(value: unknown): unknown {
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== "string") {
    return undefined;
  }

  return firstValue.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export const comingSoonQuerySchema = z.object({
  feature: z.preprocess(
    normalizeFeature,
    z.enum(COMING_SOON_FEATURE_KEYS).optional(),
  ),
});

export type ComingSoonQuery = z.infer<typeof comingSoonQuerySchema>;
