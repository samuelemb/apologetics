-- CreateTable
CREATE TABLE "ContentBookmark" (
    "userId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentBookmark_pkey" PRIMARY KEY ("userId", "contentType", "contentId")
);

-- CreateIndex
CREATE INDEX "ContentBookmark_contentType_contentId_idx" ON "ContentBookmark"("contentType", "contentId");

-- AddForeignKey
ALTER TABLE "ContentBookmark" ADD CONSTRAINT "ContentBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
