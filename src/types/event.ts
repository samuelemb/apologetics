import type { EventStatus, UserRole } from "@/generated/prisma/enums";
import type { MediaFormAsset } from "@/types/media";

export type EventActor = { id: string; role: UserRole };

export type EventMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type EventDeleteResult =
  | { ok: true }
  | { ok: false; message: string };

export type EventFormOption = { id: string; name: string; isActive: boolean };

export type EventEditValues = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  coverImageAssetId: string;
  coverImageAsset: MediaFormAsset | null;
  coverImageAlt: string;
  categoryId: string;
  tagIds: string[];
  status: EventStatus;
  featured: boolean;
  startAt: string;
  endAt: string;
  location: string;
  isOnline: boolean;
  onlineUrl: string;
  registrationUrl: string;
  registrationDeadline: string;
  capacity: string;
  publishedAt: string;
  scheduledFor: string;
  authorId: string | null;
};
