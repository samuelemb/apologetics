import assert from "node:assert/strict";
import test from "node:test";

import { ContentStatus, UserRole } from "@/generated/prisma/enums";
import {
  canCreateNews,
  canDeleteNews,
  canEditNews,
  canUseNewsStatus,
} from "@/lib/news-policy";

test("super admins and editors can publish news", () => {
  assert.equal(canUseNewsStatus(UserRole.SUPER_ADMIN, ContentStatus.PUBLISHED), true);
  assert.equal(canUseNewsStatus(UserRole.EDITOR, ContentStatus.PUBLISHED), true);
  assert.equal(canUseNewsStatus(UserRole.EDITOR, ContentStatus.SCHEDULED), true);
});

test("authors can create drafts but cannot publish or archive", () => {
  assert.equal(canCreateNews(UserRole.AUTHOR), true);
  assert.equal(canUseNewsStatus(UserRole.AUTHOR, ContentStatus.DRAFT), true);
  assert.equal(canUseNewsStatus(UserRole.AUTHOR, ContentStatus.PUBLISHED), false);
  assert.equal(canUseNewsStatus(UserRole.AUTHOR, ContentStatus.SCHEDULED), false);
  assert.equal(canUseNewsStatus(UserRole.AUTHOR, ContentStatus.ARCHIVED), false);
});

test("authors can edit only their own news", () => {
  assert.equal(canEditNews(UserRole.AUTHOR, "author-1", "author-1"), true);
  assert.equal(canEditNews(UserRole.AUTHOR, "author-1", "author-2"), false);
  assert.equal(canEditNews(UserRole.EDITOR, "editor", "author-2"), true);
});

test("only super admins and admins can delete news", () => {
  assert.equal(canDeleteNews(UserRole.SUPER_ADMIN), true);
  assert.equal(canDeleteNews(UserRole.ADMIN), true);
  assert.equal(canDeleteNews(UserRole.EDITOR), false);
  assert.equal(canDeleteNews(UserRole.AUTHOR), false);
});

