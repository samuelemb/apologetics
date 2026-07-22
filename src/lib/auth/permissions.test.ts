import assert from "node:assert/strict";
import test from "node:test";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import {
  canArchiveContent,
  canCreateContent,
  canDeleteContent,
  canEditContent,
  canManageSiteSettings,
  canManageContactMessages,
  canModerateComments,
  canManageTaxonomy,
  canManageUsers,
  canPublishContent,
  isLoginEligible,
  isPublicLoginEligible,
} from "@/lib/auth/permissions";

test("only active users are eligible to authenticate", () => {
  assert.equal(
    isLoginEligible(UserStatus.ACTIVE, UserRole.EDITOR),
    true,
  );
  assert.equal(
    isLoginEligible(UserStatus.SUSPENDED, UserRole.EDITOR),
    false,
  );
  assert.equal(
    isLoginEligible(UserStatus.INVITED, UserRole.EDITOR),
    false,
  );
});

test("only verified active public users can authenticate publicly", () => {
  assert.equal(
    isPublicLoginEligible(UserStatus.ACTIVE, UserRole.USER, new Date()),
    true,
  );
  assert.equal(
    isPublicLoginEligible(UserStatus.PENDING_VERIFICATION, UserRole.USER, null),
    false,
  );
  assert.equal(
    isPublicLoginEligible(UserStatus.ACTIVE, UserRole.AUTHOR, new Date()),
    false,
  );
});

test("super admins have full management permissions", () => {
  assert.equal(canManageUsers(UserRole.SUPER_ADMIN), true);
  assert.equal(canManageContactMessages(UserRole.SUPER_ADMIN), true);
  assert.equal(canModerateComments(UserRole.SUPER_ADMIN), true);
  assert.equal(canManageSiteSettings(UserRole.SUPER_ADMIN), true);
  assert.equal(canManageTaxonomy(UserRole.SUPER_ADMIN), true);
  assert.equal(canCreateContent(UserRole.SUPER_ADMIN), true);
  assert.equal(canEditContent(UserRole.SUPER_ADMIN, false), true);
  assert.equal(canPublishContent(UserRole.SUPER_ADMIN), true);
  assert.equal(canArchiveContent(UserRole.SUPER_ADMIN), true);
  assert.equal(canDeleteContent(UserRole.SUPER_ADMIN), true);
});

test("admins can access Users but can manage only editor and author accounts", () => {
  assert.equal(canManageUsers(UserRole.ADMIN), true);
  assert.equal(canManageContactMessages(UserRole.ADMIN), true);
  assert.equal(canModerateComments(UserRole.ADMIN), true);
  assert.equal(canManageUsers(UserRole.ADMIN, UserRole.EDITOR), true);
  assert.equal(canManageUsers(UserRole.ADMIN, UserRole.AUTHOR), true);
  assert.equal(canManageUsers(UserRole.ADMIN, UserRole.ADMIN), false);
  assert.equal(canManageUsers(UserRole.ADMIN, UserRole.SUPER_ADMIN), false);
});

test("editors can publish but cannot manage users, settings, or delete content", () => {
  assert.equal(canEditContent(UserRole.EDITOR, false), true);
  assert.equal(canPublishContent(UserRole.EDITOR), true);
  assert.equal(canArchiveContent(UserRole.EDITOR), true);
  assert.equal(canManageUsers(UserRole.EDITOR), false);
  assert.equal(canManageContactMessages(UserRole.EDITOR), false);
  assert.equal(canModerateComments(UserRole.EDITOR), false);
  assert.equal(canManageSiteSettings(UserRole.EDITOR), false);
  assert.equal(canManageTaxonomy(UserRole.EDITOR), true);
  assert.equal(canDeleteContent(UserRole.EDITOR), false);
});

test("authors can create and edit only their own content", () => {
  assert.equal(canCreateContent(UserRole.AUTHOR), true);
  assert.equal(canEditContent(UserRole.AUTHOR, true), true);
  assert.equal(canEditContent(UserRole.AUTHOR, false), false);
  assert.equal(canPublishContent(UserRole.AUTHOR), false);
  assert.equal(canArchiveContent(UserRole.AUTHOR), false);
  assert.equal(canDeleteContent(UserRole.AUTHOR), false);
  assert.equal(canManageUsers(UserRole.AUTHOR), false);
  assert.equal(canManageContactMessages(UserRole.AUTHOR), false);
  assert.equal(canModerateComments(UserRole.AUTHOR), false);
  assert.equal(canManageSiteSettings(UserRole.AUTHOR), false);
  assert.equal(canManageTaxonomy(UserRole.AUTHOR), false);
});
