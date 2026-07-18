import type { ContentStatus, UserRole } from "@/generated/prisma/enums";
import type { MediaFormAsset } from "@/types/media";

export type NewsActor = {
  id: string;
  role: UserRole;
};

export type NewsMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type NewsDeleteResult =
  | { ok: true }
  | { ok: false; message: string };

export type NewsFormOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type NewsEditValues = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  coverImageAssetId: string;
  coverImageAsset: MediaFormAsset | null;
  coverImageAlt: string;
  categoryId: string;
  tagIds: string[];
  status: ContentStatus;
  featured: boolean;
  publishedAt: string;
  scheduledFor: string;
  authorId: string | null;
};
