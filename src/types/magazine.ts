import type { ContentStatus, UserRole } from "@/generated/prisma/enums";
import type { MediaFormAsset } from "@/types/media";

export type MagazineActor = {
  id: string;
  role: UserRole;
};

export type MagazineMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export type MagazineDeleteResult =
  | { ok: true }
  | { ok: false; message: string };

export type MagazineFormOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type MagazineEditValues = {
  id: string;
  title: string;
  slug: string;
  issueNumber: string;
  volume: string;
  description: string;
  coverImageUrl: string;
  coverImageAssetId: string;
  coverImageAsset: MediaFormAsset | null;
  coverImageAlt: string;
  pdfUrl: string;
  pdfAssetId: string;
  pdfAsset: MediaFormAsset | null;
  pdfFileName: string;
  pdfFileSize: string;
  pageCount: string;
  publicationDate: string;
  categoryId: string;
  tagIds: string[];
  status: ContentStatus;
  featured: boolean;
  authorId: string | null;
};
