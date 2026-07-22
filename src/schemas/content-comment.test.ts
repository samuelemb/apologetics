import assert from "node:assert/strict";
import test from "node:test";

import { ContentType } from "@/generated/prisma/enums";
import { contentCommentCreateSchema, contentCommentEditSchema, contentCommentPageSchema } from "@/schemas/content-comment";

test("comments require published-content identifiers and non-empty bodies", () => {
  assert.equal(contentCommentCreateSchema.safeParse({ contentType: ContentType.NEWS, contentId: "news-1", body: "A thoughtful comment." }).success, true);
  assert.equal(contentCommentCreateSchema.safeParse({ contentType: ContentType.EVENT, contentId: "event-1", body: " " }).success, false);
});

test("comment edits require an identifier and a bounded body", () => {
  assert.equal(contentCommentEditSchema.safeParse({ commentId: "comment-1", body: "Updated comment" }).success, true);
  assert.equal(contentCommentEditSchema.safeParse({ commentId: "", body: "Updated comment" }).success, false);
});

test("comment pagination accepts a bounded cursor and optional parent", () => {
  assert.equal(contentCommentPageSchema.safeParse({ contentType: ContentType.MAGAZINE, contentId: "issue-1", cursor: "comment-1", parentId: "root-1" }).success, true);
  assert.equal(contentCommentPageSchema.safeParse({ contentType: ContentType.MAGAZINE, contentId: "issue-1", cursor: " " }).success, false);
});
