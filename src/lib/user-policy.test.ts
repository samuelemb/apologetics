import assert from "node:assert/strict";
import test from "node:test";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import {
  canAccessUserAdmin,
  canAssignUserRole,
  canChangeUserStatus,
  canCreateUser,
  canDeleteUser,
  canEditUser,
  preservesActiveSuperAdmin,
} from "@/lib/user-policy";

const superAdmin = { id: "super", role: UserRole.SUPER_ADMIN };
const admin = { id: "admin", role: UserRole.ADMIN };
const editor = { id: "editor", role: UserRole.EDITOR };
const author = { id: "author", role: UserRole.AUTHOR };

test("super administrators can create and manage every role", () => {
  for (const role of Object.values(UserRole)) {
    assert.equal(canCreateUser(superAdmin.role, role), true);
    assert.equal(
      canEditUser(superAdmin, { id: `target-${role}`, role }),
      true,
    );
    assert.equal(
      canAssignUserRole(
        superAdmin,
        { id: `target-${role}`, role },
        UserRole.ADMIN,
      ),
      true,
    );
  }
});

test("administrators can create and manage only editors and authors", () => {
  assert.equal(canAccessUserAdmin(admin.role), true);
  assert.equal(canCreateUser(admin.role, UserRole.EDITOR), true);
  assert.equal(canCreateUser(admin.role, UserRole.AUTHOR), true);
  assert.equal(canCreateUser(admin.role, UserRole.ADMIN), false);
  assert.equal(canCreateUser(admin.role, UserRole.SUPER_ADMIN), false);
  assert.equal(canEditUser(admin, editor), true);
  assert.equal(canEditUser(admin, author), true);
  assert.equal(canEditUser(admin, superAdmin), false);
  assert.equal(
    canEditUser(admin, { id: "other-admin", role: UserRole.ADMIN }),
    false,
  );
});

test("editors and authors cannot access or mutate Users administration", () => {
  for (const actor of [editor, author]) {
    assert.equal(canAccessUserAdmin(actor.role), false);
    assert.equal(canCreateUser(actor.role, UserRole.AUTHOR), false);
    assert.equal(canEditUser(actor, author), false);
    assert.equal(canChangeUserStatus(actor, author), false);
    assert.equal(canDeleteUser(actor, author), false);
  }
});

test("self-service policy permits profile edits but rejects role, status, and deletion changes", () => {
  assert.equal(canEditUser(admin, admin), true);
  assert.equal(canAssignUserRole(admin, admin, UserRole.ADMIN), true);
  assert.equal(canAssignUserRole(admin, admin, UserRole.AUTHOR), false);
  assert.equal(canChangeUserStatus(admin, admin), false);
  assert.equal(canDeleteUser(admin, admin), false);
});

test("the active super-administrator invariant blocks removal of the last active account", () => {
  const activeSuperAdmin = {
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  };

  assert.equal(
    preservesActiveSuperAdmin(1, activeSuperAdmin, {
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.SUSPENDED,
    }),
    false,
  );
  assert.equal(
    preservesActiveSuperAdmin(1, activeSuperAdmin, {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    }),
    false,
  );
  assert.equal(preservesActiveSuperAdmin(1, activeSuperAdmin, null), false);
  assert.equal(
    preservesActiveSuperAdmin(2, activeSuperAdmin, {
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.SUSPENDED,
    }),
    true,
  );
  assert.equal(preservesActiveSuperAdmin(2, activeSuperAdmin, null), true);
});
