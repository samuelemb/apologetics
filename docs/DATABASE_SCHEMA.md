# Database Schema

## Current Phase

PostgreSQL is managed through Prisma in `prisma/schema.prisma`. The initial
content schema is extended by the `add_media_asset_tracking` migration; previous
migrations remain unchanged.

## Core Domains

- `User` stores authenticated administrator identity, role, status, and password
  hash. Authored News, Event, and Magazine records use nullable `SetNull`
  relations so deleting a user preserves content.
- `NewsArticle`, `Event`, and `MagazineIssue` store content, publication state,
  counters, author/category relationships, and explicit tag join rows.
- `Category` and `Tag` provide shared taxonomy.
- `ContactMessage`, `Subscriber`, `SiteSetting`, `ContentView`, and `AuditLog`
  support administration and future public workflows.

## MediaAsset

`MediaAsset` tracks provider-backed files without storing binary data:

- `provider`: currently `UPLOADTHING`.
- `fileKey`: unique server-only provider identifier used for deletion.
- `url`: stable public delivery URL retained for future public pages.
- `originalName`, `mimeType`, `sizeBytes`, and `kind`: trusted callback metadata.
- `status`: `PENDING`, `ATTACHED`, `ORPHANED`, or `DELETED`.
- `uploadedById`: nullable `SetNull` relation so user deletion never deletes a
  file or content.
- `createdAt`, `attachedAt`, and `deletedAt`: lifecycle timestamps.

One-to-one optional asset foreign keys identify the only supported attachment
slots:

- `NewsArticle.coverImageAssetId`
- `Event.coverImageAssetId`
- `MagazineIssue.coverImageAssetId`
- `MagazineIssue.pdfAssetId`

These foreign keys are unique, preventing one asset from being reused across
unrelated content. Existing URL and PDF metadata fields remain in place for
seeded and external URL content. Provider-backed mutations populate those fields
from `MediaAsset`; external records leave the asset foreign keys null.

Indexes support file-key lookup, uploader/status checks, kind/status checks, and
cleanup scans by status and creation time. UploadThing tokens, signed session
values, password data, and raw file contents are never stored in this model.

## Environment

Set `DATABASE_URL` in `.env` using the format shown in `.env.example`. Prisma
configuration loads it server-side from `prisma.config.ts`.
