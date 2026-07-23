import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  MediaAssetStatus,
  MediaProvider,
  type MediaAssetKind,
} from "@/generated/prisma/enums";
import { PENDING_MEDIA_MAX_AGE_MS } from "@/config/uploads";
import { isLoginEligible } from "@/lib/auth/permissions";
import { canClaimPendingMedia, canUploadMedia } from "@/lib/media-policy";
import { prisma } from "@/lib/prisma";
import { deleteUploadThingFiles } from "@/lib/uploadthing-server";
import type { MediaActor, MediaFormAsset } from "@/types/media";

type TransactionClient = Prisma.TransactionClient;
type RemoteDelete = (fileKeys: string[]) => Promise<void>;

type ProviderFile = {
  fileKey: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaAssetKind;
  uploadedById: string;
};

const safeAssetSelect = {
  id: true,
  url: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  kind: true,
  status: true,
} satisfies Prisma.MediaAssetSelect;

const lifecycleAssetSelect = {
  ...safeAssetSelect,
  fileKey: true,
  uploadedById: true,
  createdAt: true,
  newsCoverFor: { select: { id: true } },
  eventCoverFor: { select: { id: true } },
  magazineCoverFor: { select: { id: true } },
  magazinePdfFor: { select: { id: true } },
} satisfies Prisma.MediaAssetSelect;

export class MediaServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "INVALID_ASSET"
      | "CONFLICT"
      | "PROVIDER",
    message: string,
  ) {
    super(message);
    this.name = "MediaServiceError";
  }
}

function toSafeAsset(asset: {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaAssetKind;
  status: MediaAssetStatus;
}): MediaFormAsset {
  return asset;
}

function hasContentRelation(asset: {
  newsCoverFor: { id: string } | null;
  eventCoverFor: { id: string } | null;
  magazineCoverFor: { id: string } | null;
  magazinePdfFor: { id: string } | null;
}): boolean {
  return Boolean(
    asset.newsCoverFor ||
      asset.eventCoverFor ||
      asset.magazineCoverFor ||
      asset.magazinePdfFor,
  );
}

async function findFreshActor(
  client: TransactionClient | typeof prisma,
  actorId: string,
) {
  const user = await client.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, status: true },
  });

  if (!user || !isLoginEligible(user.status, user.role)) {
    throw new MediaServiceError(
      "FORBIDDEN",
      "You do not have permission to manage media.",
    );
  }

  return { id: user.id, role: user.role };
}

export async function requireFreshMediaActor(
  actor: MediaActor,
): Promise<MediaActor> {
  return findFreshActor(prisma, actor.id);
}

export async function recordCompletedUpload(
  input: ProviderFile,
): Promise<MediaFormAsset> {
  const actor = await findFreshActor(prisma, input.uploadedById);
  if (!canUploadMedia(actor.role)) {
    throw new MediaServiceError(
      "FORBIDDEN",
      "You do not have permission to upload media.",
    );
  }

  const existing = await prisma.mediaAsset.findUnique({
    where: { fileKey: input.fileKey },
    select: safeAssetSelect,
  });
  if (existing) return toSafeAsset(existing);

  let asset;
  try {
    asset = await prisma.$transaction(async (transaction) => {
      const created = await transaction.mediaAsset.create({
        data: {
          provider: MediaProvider.UPLOADTHING,
          kind: input.kind,
          status: MediaAssetStatus.PENDING,
          fileKey: input.fileKey,
          url: input.url,
          originalName: input.originalName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          uploadedById: actor.id,
        },
        select: safeAssetSelect,
      });

      await transaction.auditLog.create({
        data: {
          userId: actor.id,
          action: "MEDIA_UPLOADED",
          entityType: "MediaAsset",
          entityId: created.id,
          metadata: {
            provider: MediaProvider.UPLOADTHING,
            kind: created.kind,
            mimeType: created.mimeType,
            sizeBytes: created.sizeBytes,
          },
        },
      });

      return created;
    });
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }

    asset = await prisma.mediaAsset.findUnique({
      where: { fileKey: input.fileKey },
      select: safeAssetSelect,
    });
    if (!asset) throw error;
  }

  return toSafeAsset(asset);
}

export async function recordCompletedProfileAvatarUpload(
  input: ProviderFile,
): Promise<MediaFormAsset> {
  const user = await prisma.user.findUnique({
    where: { id: input.uploadedById },
    select: { id: true, role: true, status: true, emailVerifiedAt: true },
  });
  if (!user || user.role !== "USER" || !user.emailVerifiedAt || !isLoginEligible(user.status, user.role)) {
    throw new MediaServiceError("FORBIDDEN", "You do not have permission to upload a profile picture.");
  }

  const existing = await prisma.mediaAsset.findUnique({
    where: { fileKey: input.fileKey },
    select: safeAssetSelect,
  });
  if (existing) return toSafeAsset(existing);

  const asset = await prisma.mediaAsset.create({
    data: {
      provider: MediaProvider.UPLOADTHING,
      kind: input.kind,
      status: MediaAssetStatus.PENDING,
      fileKey: input.fileKey,
      url: input.url,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedById: user.id,
    },
    select: safeAssetSelect,
  });
  return toSafeAsset(asset);
}

export async function recordOrphanedProviderUpload(
  input: Omit<ProviderFile, "uploadedById"> & { uploadedById: string | null },
): Promise<void> {
  const existing = await prisma.mediaAsset.findUnique({
    where: { fileKey: input.fileKey },
    select: { id: true },
  });
  if (existing) return;

  const uploader = input.uploadedById
    ? await prisma.user.findUnique({
        where: { id: input.uploadedById },
        select: { id: true },
      })
    : null;

  await prisma.$transaction(async (transaction) => {
    const asset = await transaction.mediaAsset.create({
      data: {
        provider: MediaProvider.UPLOADTHING,
        kind: input.kind,
        status: MediaAssetStatus.ORPHANED,
        fileKey: input.fileKey,
        url: input.url,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedById: uploader?.id,
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        userId: uploader?.id,
        action: "MEDIA_UPLOAD_ORPHANED",
        entityType: "MediaAsset",
        entityId: asset.id,
        metadata: { kind: input.kind, provider: MediaProvider.UPLOADTHING },
      },
    });
  });
}

export async function resolvePendingMediaAsset(
  transaction: TransactionClient,
  actor: MediaActor,
  assetId: string,
  expectedKind: MediaAssetKind,
) {
  const freshActor = await findFreshActor(transaction, actor.id);
  const asset = await transaction.mediaAsset.findUnique({
    where: { id: assetId },
    select: lifecycleAssetSelect,
  });

  if (!asset) {
    throw new MediaServiceError("NOT_FOUND", "The selected upload was not found.");
  }
  if (asset.kind !== expectedKind || asset.status !== MediaAssetStatus.PENDING) {
    throw new MediaServiceError(
      "INVALID_ASSET",
      "The selected upload cannot be attached to this field.",
    );
  }
  if (hasContentRelation(asset)) {
    throw new MediaServiceError(
      "CONFLICT",
      "The selected upload is already attached.",
    );
  }
  if (
    !canClaimPendingMedia(
      freshActor.role,
      freshActor.id,
      asset.uploadedById,
    )
  ) {
    throw new MediaServiceError(
      "FORBIDDEN",
      "You do not have permission to use this upload.",
    );
  }

  return asset;
}

export async function markMediaAssetAttached(
  transaction: TransactionClient,
  input: {
    assetId: string;
    actorId: string;
    entityType: "NewsArticle" | "Event" | "MagazineIssue";
    entityId: string;
    slot: "cover" | "pdf";
  },
): Promise<void> {
  const result = await transaction.mediaAsset.updateMany({
    where: { id: input.assetId, status: MediaAssetStatus.PENDING },
    data: { status: MediaAssetStatus.ATTACHED, attachedAt: new Date() },
  });
  if (result.count !== 1) {
    throw new MediaServiceError(
      "CONFLICT",
      "The selected upload is no longer available.",
    );
  }

  await transaction.auditLog.create({
    data: {
      userId: input.actorId,
      action: "MEDIA_ATTACHED",
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: { assetId: input.assetId, slot: input.slot },
    },
  });
}

export async function markMediaAssetOrphaned(
  transaction: TransactionClient,
  input: {
    assetId: string;
    actorId: string;
    entityType: "NewsArticle" | "Event" | "MagazineIssue";
    entityId: string;
    slot: "cover" | "pdf";
    replacementAssetId?: string | null;
  },
): Promise<void> {
  await transaction.mediaAsset.updateMany({
    where: { id: input.assetId, status: MediaAssetStatus.ATTACHED },
    data: { status: MediaAssetStatus.ORPHANED },
  });
  await transaction.auditLog.create({
    data: {
      userId: input.actorId,
      action: input.replacementAssetId ? "MEDIA_REPLACED" : "MEDIA_DETACHED",
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: {
        assetId: input.assetId,
        replacementAssetId: input.replacementAssetId ?? null,
        slot: input.slot,
      },
    },
  });
}

export async function finalizeOrphanedMediaAsset(
  assetId: string,
  options: {
    actorId: string | null;
    successAction?: string;
    remoteDelete?: RemoteDelete;
  },
): Promise<boolean> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: lifecycleAssetSelect,
  });

  if (!asset || asset.status === MediaAssetStatus.DELETED) return true;
  if (asset.status !== MediaAssetStatus.ORPHANED || hasContentRelation(asset)) {
    return false;
  }

  try {
    await (options.remoteDelete ?? deleteUploadThingFiles)([asset.fileKey]);
    await prisma.$transaction([
      prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { status: MediaAssetStatus.DELETED, deletedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          userId: options.actorId,
          action: options.successAction ?? "MEDIA_DELETED",
          entityType: "MediaAsset",
          entityId: asset.id,
          metadata: { kind: asset.kind, provider: MediaProvider.UPLOADTHING },
        },
      }),
    ]);
    return true;
  } catch {
    await prisma.auditLog.create({
      data: {
        userId: options.actorId,
        action: "MEDIA_DELETE_FAILED",
        entityType: "MediaAsset",
        entityId: asset.id,
        metadata: { kind: asset.kind, provider: MediaProvider.UPLOADTHING },
      },
    });
    return false;
  }
}

export async function discardPendingMediaAsset(
  actor: MediaActor,
  assetId: string,
  remoteDelete: RemoteDelete = deleteUploadThingFiles,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const freshActor = await findFreshActor(transaction, actor.id);
    const asset = await transaction.mediaAsset.findUnique({
      where: { id: assetId },
      select: lifecycleAssetSelect,
    });

    if (!asset) {
      throw new MediaServiceError("NOT_FOUND", "The upload was not found.");
    }
    if (
      (asset.status !== MediaAssetStatus.PENDING &&
        asset.status !== MediaAssetStatus.ORPHANED) ||
      hasContentRelation(asset)
    ) {
      throw new MediaServiceError(
        "INVALID_ASSET",
        "Attached media cannot be discarded from this action.",
      );
    }
    if (
      !canClaimPendingMedia(
        freshActor.role,
        freshActor.id,
        asset.uploadedById,
      )
    ) {
      throw new MediaServiceError(
        "FORBIDDEN",
        "You do not have permission to discard this upload.",
      );
    }

    await transaction.mediaAsset.update({
      where: { id: asset.id },
      data: { status: MediaAssetStatus.ORPHANED },
    });
    await transaction.auditLog.create({
      data: {
        userId: freshActor.id,
        action: "MEDIA_DISCARD_REQUESTED",
        entityType: "MediaAsset",
        entityId: asset.id,
        metadata: { kind: asset.kind },
      },
    });
  });

  const deleted = await finalizeOrphanedMediaAsset(assetId, {
    actorId: actor.id,
    successAction: "MEDIA_DISCARDED",
    remoteDelete,
  });
  if (!deleted) {
    throw new MediaServiceError(
      "PROVIDER",
      "The file could not be removed from storage. It has been queued for cleanup.",
    );
  }
}

export type MediaCleanupResult = {
  candidates: number;
  deleted: number;
  failed: number;
  dryRun: boolean;
};

export async function cleanupStaleMediaAssets(options: {
  dryRun: boolean;
  now?: Date;
  remoteDelete?: RemoteDelete;
}): Promise<MediaCleanupResult> {
  const cutoff = new Date(
    (options.now ?? new Date()).getTime() - PENDING_MEDIA_MAX_AGE_MS,
  );
  const candidates = await prisma.mediaAsset.findMany({
    where: {
      OR: [
        { status: MediaAssetStatus.ORPHANED },
        { status: MediaAssetStatus.PENDING, createdAt: { lt: cutoff } },
      ],
      newsCoverFor: { is: null },
      eventCoverFor: { is: null },
      magazineCoverFor: { is: null },
      magazinePdfFor: { is: null },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true },
  });

  if (options.dryRun) {
    return { candidates: candidates.length, deleted: 0, failed: 0, dryRun: true };
  }

  let deleted = 0;
  let failed = 0;
  for (const candidate of candidates) {
    if (candidate.status === MediaAssetStatus.PENDING) {
      await prisma.mediaAsset.updateMany({
        where: {
          id: candidate.id,
          status: MediaAssetStatus.PENDING,
          createdAt: { lt: cutoff },
        },
        data: { status: MediaAssetStatus.ORPHANED },
      });
    }

    const success = await finalizeOrphanedMediaAsset(candidate.id, {
      actorId: null,
      successAction: "MEDIA_CLEANUP_DELETED",
      remoteDelete: options.remoteDelete,
    });
    if (success) deleted += 1;
    else failed += 1;
  }

  return { candidates: candidates.length, deleted, failed, dryRun: false };
}
