import assert from "node:assert/strict";
import test from "node:test";

import { UserRole } from "@/generated/prisma/enums";
import {
  canAccessCategoryAdmin,
  canCreateCategory,
  canDeleteCategory,
  canSetCategoryActive,
} from "@/lib/category-policy";

test("category policy grants management to editors but deletion only to admins", () => {
  assert.equal(canAccessCategoryAdmin(UserRole.SUPER_ADMIN), true);
  assert.equal(canDeleteCategory(UserRole.SUPER_ADMIN), true);
  assert.equal(canDeleteCategory(UserRole.ADMIN), true);
  assert.equal(canCreateCategory(UserRole.EDITOR), true);
  assert.equal(canSetCategoryActive(UserRole.EDITOR), true);
  assert.equal(canDeleteCategory(UserRole.EDITOR), false);
});

test("authors cannot administer categories", () => {
  assert.equal(canAccessCategoryAdmin(UserRole.AUTHOR), false);
  assert.equal(canCreateCategory(UserRole.AUTHOR), false);
  assert.equal(canSetCategoryActive(UserRole.AUTHOR), false);
  assert.equal(canDeleteCategory(UserRole.AUTHOR), false);
});
