-- CreateEnum
CREATE TYPE "MediaProvider" AS ENUM ('UPLOADTHING');

-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('NEWS_COVER', 'EVENT_COVER', 'MAGAZINE_COVER', 'MAGAZINE_PDF');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PENDING', 'ATTACHED', 'ORPHANED', 'DELETED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "coverImageAssetId" TEXT;

-- AlterTable
ALTER TABLE "MagazineIssue" ADD COLUMN "coverImageAssetId" TEXT,
ADD COLUMN "pdfAssetId" TEXT;

-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN "coverImageAssetId" TEXT;

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "provider" "MediaProvider" NOT NULL DEFAULT 'UPLOADTHING',
    "kind" "MediaAssetKind" NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'PENDING',
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_fileKey_key" ON "MediaAsset"("fileKey");

-- CreateIndex
CREATE INDEX "MediaAsset_status_createdAt_idx" ON "MediaAsset"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_status_idx" ON "MediaAsset"("kind", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_status_idx" ON "MediaAsset"("uploadedById", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Event_coverImageAssetId_key" ON "Event"("coverImageAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "MagazineIssue_coverImageAssetId_key" ON "MagazineIssue"("coverImageAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "MagazineIssue_pdfAssetId_key" ON "MagazineIssue"("pdfAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_coverImageAssetId_key" ON "NewsArticle"("coverImageAssetId");

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_coverImageAssetId_fkey" FOREIGN KEY ("coverImageAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_coverImageAssetId_fkey" FOREIGN KEY ("coverImageAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagazineIssue" ADD CONSTRAINT "MagazineIssue_coverImageAssetId_fkey" FOREIGN KEY ("coverImageAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagazineIssue" ADD CONSTRAINT "MagazineIssue_pdfAssetId_fkey" FOREIGN KEY ("pdfAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
