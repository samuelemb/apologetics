-- CreateEnum
CREATE TYPE "ContentCommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateTable
CREATE TABLE "ContentComment" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" "ContentCommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentComment_contentType_contentId_createdAt_idx" ON "ContentComment"("contentType", "contentId", "createdAt");
CREATE INDEX "ContentComment_authorId_createdAt_idx" ON "ContentComment"("authorId", "createdAt");
CREATE INDEX "ContentComment_parentId_idx" ON "ContentComment"("parentId");

-- AddForeignKey
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
