import assert from "node:assert/strict";
import test from "node:test";

import { UserRole } from "@/generated/prisma/enums";
import {
  canAccessTagAdmin,
  canCreateTag,
  canDeleteTag,
  canSetTagActive,
} from "@/lib/tag-policy";

test("tag policy grants management to editors but deletion only to admins", () => {
  assert.equal(canAccessTagAdmin(UserRole.SUPER_ADMIN), true);
  assert.equal(canDeleteTag(UserRole.SUPER_ADMIN), true);
  assert.equal(canDeleteTag(UserRole.ADMIN), true);
  assert.equal(canCreateTag(UserRole.EDITOR), true);
  assert.equal(canSetTagActive(UserRole.EDITOR), true);
  assert.equal(canDeleteTag(UserRole.EDITOR), false);
});

test("authors cannot administer tags", () => {
  assert.equal(canAccessTagAdmin(UserRole.AUTHOR), false);
  assert.equal(canCreateTag(UserRole.AUTHOR), false);
  assert.equal(canSetTagActive(UserRole.AUTHOR), false);
  assert.equal(canDeleteTag(UserRole.AUTHOR), false);
});
