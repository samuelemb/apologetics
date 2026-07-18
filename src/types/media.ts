import type {
  MediaAssetKind,
  MediaAssetStatus,
  UserRole,
} from "@/generated/prisma/enums";

export type MediaActor = {
  id: string;
  role: UserRole;
};

export type MediaFormAsset = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaAssetKind;
  status: MediaAssetStatus;
};

export type MediaMutationResult =
  | { ok: true }
  | { ok: false; message: string };
