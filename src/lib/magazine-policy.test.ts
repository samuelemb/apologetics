import assert from "node:assert/strict";
import test from "node:test";

import { ContentStatus, UserRole } from "@/generated/prisma/enums";
import {
  canCreateMagazine,
  canDeleteMagazine,
  canEditMagazine,
  canUseMagazineStatus,
} from "@/lib/magazine-policy";

test("authors can create and edit only their own draft magazines", () => {
  assert.equal(canCreateMagazine(UserRole.AUTHOR), true);
  assert.equal(canUseMagazineStatus(UserRole.AUTHOR, ContentStatus.DRAFT), true);
  assert.equal(
    canEditMagazine(
      UserRole.AUTHOR,
      "author-1",
      "author-1",
      ContentStatus.DRAFT,
    ),
    true,
  );
  assert.equal(
    canEditMagazine(
      UserRole.AUTHOR,
      "author-1",
      "author-2",
      ContentStatus.DRAFT,
    ),
    false,
  );
  assert.equal(
    canEditMagazine(
      UserRole.AUTHOR,
      "author-1",
      "author-1",
      ContentStatus.PUBLISHED,
    ),
    false,
  );
});

test("authors cannot publish, archive, schedule, or delete magazines", () => {
  assert.equal(canUseMagazineStatus(UserRole.AUTHOR, ContentStatus.PUBLISHED), false);
  assert.equal(canUseMagazineStatus(UserRole.AUTHOR, ContentStatus.ARCHIVED), false);
  assert.equal(canUseMagazineStatus(UserRole.AUTHOR, ContentStatus.SCHEDULED), false);
  assert.equal(canDeleteMagazine(UserRole.AUTHOR), false);
});

test("editors can publish and archive but cannot delete", () => {
  assert.equal(canUseMagazineStatus(UserRole.EDITOR, ContentStatus.PUBLISHED), true);
  assert.equal(canUseMagazineStatus(UserRole.EDITOR, ContentStatus.ARCHIVED), true);
  assert.equal(canUseMagazineStatus(UserRole.EDITOR, ContentStatus.SCHEDULED), false);
  assert.equal(canDeleteMagazine(UserRole.EDITOR), false);
});

test("admins and super admins can manage and delete magazine issues", () => {
  for (const role of [UserRole.ADMIN, UserRole.SUPER_ADMIN]) {
    assert.equal(canCreateMagazine(role), true);
    assert.equal(
      canEditMagazine(role, "admin", "author", ContentStatus.PUBLISHED),
      true,
    );
    assert.equal(canUseMagazineStatus(role, ContentStatus.PUBLISHED), true);
    assert.equal(canUseMagazineStatus(role, ContentStatus.ARCHIVED), true);
    assert.equal(canUseMagazineStatus(role, ContentStatus.SCHEDULED), false);
    assert.equal(canDeleteMagazine(role), true);
  }
});
