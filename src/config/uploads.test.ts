import assert from "node:assert/strict";
import test from "node:test";

import {
  hasAllowedFileSignature,
  validateUploadCandidate,
} from "@/config/uploads";
import { mediaAssetIdSchema, mediaAssetKindSchema } from "@/schemas/media";

test("1. valid image metadata is accepted", () => {
  assert.equal(
    validateUploadCandidate("NEWS_COVER", {
      name: "cover.jpg",
      size: 512_000,
      type: "image/jpeg",
    }),
    null,
  );
  assert.equal(
    hasAllowedFileSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff])),
    true,
  );
});

test("2. unsupported image MIME type is rejected", () => {
  assert.match(
    validateUploadCandidate("EVENT_COVER", {
      name: "cover.svg",
      size: 1_000,
      type: "image/svg+xml",
    }) ?? "",
    /JPEG, PNG, and WebP/,
  );
});

test("3. oversized image metadata is rejected", () => {
  assert.match(
    validateUploadCandidate("MAGAZINE_COVER", {
      name: "cover.webp",
      size: 8 * 1024 * 1024 + 1,
      type: "image/webp",
    }) ?? "",
    /8 MB/,
  );
});

test("4. valid PDF metadata is accepted", () => {
  assert.equal(
    validateUploadCandidate("MAGAZINE_PDF", {
      name: "issue.pdf",
      size: 4_000_000,
      type: "application/pdf",
    }),
    null,
  );
  assert.equal(
    hasAllowedFileSignature(
      "application/pdf",
      new TextEncoder().encode("%PDF-1.7"),
    ),
    true,
  );
});

test("5. non-PDF magazine upload is rejected", () => {
  assert.match(
    validateUploadCandidate("MAGAZINE_PDF", {
      name: "issue.jpg",
      size: 2_000,
      type: "image/jpeg",
    }) ?? "",
    /Only PDF/,
  );
});

test("6. oversized PDF metadata is rejected", () => {
  assert.match(
    validateUploadCandidate("MAGAZINE_PDF", {
      name: "issue.pdf",
      size: 50 * 1024 * 1024 + 1,
      type: "application/pdf",
    }) ?? "",
    /50 MB/,
  );
});

test("7. invalid asset kind is rejected", () => {
  assert.equal(mediaAssetKindSchema.safeParse("PROFILE_PHOTO").success, false);
});

test("8. invalid asset ID is rejected", () => {
  assert.equal(mediaAssetIdSchema.safeParse("").success, false);
  assert.equal(mediaAssetIdSchema.safeParse("x".repeat(65)).success, false);
});
