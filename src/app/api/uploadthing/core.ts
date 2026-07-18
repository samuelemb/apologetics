import "server-only";

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import {
  hasAllowedFileSignature,
  validateUploadCandidate,
} from "@/config/uploads";
import type { MediaAssetKind } from "@/generated/prisma/enums";
import { getCurrentAdmin } from "@/lib/auth/guards";
import { canUploadMedia } from "@/lib/media-policy";
import { deleteUploadThingFiles } from "@/lib/uploadthing-server";
import {
  recordCompletedUpload,
  recordOrphanedProviderUpload,
} from "@/services/media.service";

const upload = createUploadthing({
  errorFormatter: (error) => ({
    message:
      error.code === "MISSING_ENV" || error.code === "INVALID_SERVER_CONFIG"
        ? "File storage is not configured."
        : "The upload could not be completed. Check the file and try again.",
  }),
});

const imageRouteConfig = {
  "image/jpeg": { maxFileSize: "8MB", maxFileCount: 1 },
  "image/png": { maxFileSize: "8MB", maxFileCount: 1 },
  "image/webp": { maxFileSize: "8MB", maxFileCount: 1 },
} as const;

const pdfRouteConfig = {
  "application/pdf": {
    maxFileSize: "64MB",
    maxFileCount: 1,
    contentDisposition: "attachment",
  },
} as const;

const INVALID_COMPLETED_UPLOAD_MESSAGE =
  "The upload could not be completed. Check the file and try again.";

function sanitizeOriginalName(name: string): string {
  const baseName = name.replaceAll("\\", "/").split("/").pop() ?? "upload";
  const sanitized = baseName.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (sanitized || "upload").slice(0, 255);
}

function isTrustedDeliveryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".ufs.sh") &&
      url.pathname.startsWith("/f/")
    );
  } catch {
    return false;
  }
}

async function readSignatureBytes(url: string): Promise<Uint8Array> {
  if (!isTrustedDeliveryUrl(url)) {
    throw new Error("Untrusted delivery URL");
  }

  const response = await fetch(url, {
    headers: { Range: "bytes=0-15" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok || !response.body) {
    throw new Error("File signature could not be read");
  }

  const reader = response.body.getReader();
  try {
    const firstChunk = await reader.read();
    return firstChunk.value?.slice(0, 16) ?? new Uint8Array();
  } finally {
    await reader.cancel();
  }
}

async function authorizeUpload(
  kind: MediaAssetKind,
  files: readonly { name: string; size: number; type: string }[],
) {
  const user = await getCurrentAdmin();
  if (!user || !canUploadMedia(user.role)) {
    throw new UploadThingError({
      code: "FORBIDDEN",
      message: "Authentication is required.",
    });
  }
  if (files.length !== 1) {
    throw new UploadThingError({
      code: "BAD_REQUEST",
      message: "Select exactly one file.",
    });
  }

  const validationError = validateUploadCandidate(kind, files[0]);
  if (validationError) {
    throw new UploadThingError({
      code: files[0].size > 8 * 1024 * 1024 ? "TOO_LARGE" : "BAD_REQUEST",
      message: validationError,
    });
  }

  return { userId: user.id };
}

async function completeUpload(
  kind: MediaAssetKind,
  metadata: { userId: string },
  file: {
    key: string;
    ufsUrl: string;
    name: string;
    type: string;
    size: number;
  },
) {
  const providerFile = {
    fileKey: file.key,
    url: file.ufsUrl,
    originalName: sanitizeOriginalName(file.name),
    mimeType: file.type,
    sizeBytes: file.size,
    kind,
    uploadedById: metadata.userId,
  };

  try {
    const validationError = validateUploadCandidate(kind, {
      name: providerFile.originalName,
      size: providerFile.sizeBytes,
      type: providerFile.mimeType,
    });
    if (validationError) throw new Error("Invalid completed upload metadata");

    const signature = await readSignatureBytes(providerFile.url);
    if (!hasAllowedFileSignature(providerFile.mimeType, signature)) {
      throw new Error("Invalid completed upload signature");
    }

    const asset = await recordCompletedUpload(providerFile);
    return { asset, error: null };
  } catch {
    try {
      await deleteUploadThingFiles([providerFile.fileKey]);
    } catch {
      await recordOrphanedProviderUpload(providerFile).catch(() => undefined);
    }

    // UploadThing waits for onUploadComplete data. Returning a safe failure
    // result prevents callback polling from hanging after verification fails.
    return { asset: null, error: INVALID_COMPLETED_UPLOAD_MESSAGE };
  }
}

export const uploadRouter = {
  newsCover: upload(imageRouteConfig)
    .middleware(({ files }) => authorizeUpload("NEWS_COVER", files))
    .onUploadComplete(({ metadata, file }) =>
      completeUpload("NEWS_COVER", metadata, file),
    ),
  eventCover: upload(imageRouteConfig)
    .middleware(({ files }) => authorizeUpload("EVENT_COVER", files))
    .onUploadComplete(({ metadata, file }) =>
      completeUpload("EVENT_COVER", metadata, file),
    ),
  magazineCover: upload(imageRouteConfig)
    .middleware(({ files }) => authorizeUpload("MAGAZINE_COVER", files))
    .onUploadComplete(({ metadata, file }) =>
      completeUpload("MAGAZINE_COVER", metadata, file),
    ),
  magazinePdf: upload(pdfRouteConfig)
    .middleware(({ files }) => authorizeUpload("MAGAZINE_PDF", files))
    .onUploadComplete(({ metadata, file }) =>
      completeUpload("MAGAZINE_PDF", metadata, file),
    ),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
