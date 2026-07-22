-- CreateTable
CREATE TABLE "ContentLike" (
    "userId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentLike_pkey" PRIMARY KEY ("userId","contentType","contentId")
);

-- CreateIndex
CREATE INDEX "ContentLike_contentType_contentId_idx" ON "ContentLike"("contentType", "contentId");

-- AddForeignKey
ALTER TABLE "ContentLike" ADD CONSTRAINT "ContentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
