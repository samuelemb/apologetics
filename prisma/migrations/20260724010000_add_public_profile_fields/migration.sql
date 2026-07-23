-- AlterEnum
ALTER TYPE "MediaAssetKind" ADD VALUE 'PROFILE_AVATAR';

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "timezone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");
