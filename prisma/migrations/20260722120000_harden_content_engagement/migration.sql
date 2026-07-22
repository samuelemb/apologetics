-- Supports paginated root-comment and reply queries.
CREATE INDEX "ContentComment_contentType_contentId_parentId_createdAt_idx"
ON "ContentComment"("contentType", "contentId", "parentId", "createdAt");
