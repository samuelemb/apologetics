import type { MediaAssetKind } from "@/generated/prisma/enums";

export const IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const PDF_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const PENDING_MEDIA_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const IMAGE_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PDF_UPLOAD_MIME_TYPES = ["application/pdf"] as const;

export type MediaUploadEndpoint =
  | "newsCover"
  | "eventCover"
  | "magazineCover"
  | "magazinePdf";

export type UploadCandidate = {
  name: string;
  size: number;
  type: string;
};

type UploadRule = {
  accept: string;
  maximumBytes: number;
  mimeTypes: readonly string[];
};

export const MEDIA_UPLOAD_RULES: Record<MediaAssetKind, UploadRule> = {
  NEWS_COVER: {
    accept: IMAGE_UPLOAD_MIME_TYPES.join(","),
    maximumBytes: IMAGE_UPLOAD_MAX_BYTES,
    mimeTypes: IMAGE_UPLOAD_MIME_TYPES,
  },
  EVENT_COVER: {
    accept: IMAGE_UPLOAD_MIME_TYPES.join(","),
    maximumBytes: IMAGE_UPLOAD_MAX_BYTES,
    mimeTypes: IMAGE_UPLOAD_MIME_TYPES,
  },
  MAGAZINE_COVER: {
    accept: IMAGE_UPLOAD_MIME_TYPES.join(","),
    maximumBytes: IMAGE_UPLOAD_MAX_BYTES,
    mimeTypes: IMAGE_UPLOAD_MIME_TYPES,
  },
  MAGAZINE_PDF: {
    accept: PDF_UPLOAD_MIME_TYPES.join(","),
    maximumBytes: PDF_UPLOAD_MAX_BYTES,
    mimeTypes: PDF_UPLOAD_MIME_TYPES,
  },
};

const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

export function validateUploadCandidate(
  kind: MediaAssetKind,
  file: UploadCandidate,
): string | null {
  const rule = MEDIA_UPLOAD_RULES[kind];

  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return "The selected file is empty or has an invalid size.";
  }
  if (file.size > rule.maximumBytes) {
    return kind === "MAGAZINE_PDF"
      ? "PDF files must be 50 MB or smaller."
      : "Images must be 8 MB or smaller.";
  }
  if (!rule.mimeTypes.includes(file.type)) {
    return kind === "MAGAZINE_PDF"
      ? "Only PDF files are allowed."
      : "Only JPEG, PNG, and WebP images are allowed.";
  }

  const lowerName = file.name.trim().toLowerCase();
  const extensions = MIME_EXTENSIONS[file.type] ?? [];
  if (!extensions.some((extension) => lowerName.endsWith(extension))) {
    return "The file extension does not match its declared file type.";
  }

  return null;
}

export function hasAllowedFileSignature(
  mimeType: string,
  bytes: Uint8Array,
): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  }
  if (mimeType === "application/pdf") {
    return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  }

  return false;
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
