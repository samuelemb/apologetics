import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { canManageUsers } from "@/lib/auth/permissions";

export type UserPolicyActor = {
  id: string;
  role: UserRole;
};

export type UserPolicyTarget = {
  id: string;
  role: UserRole;
};

const adminManageableRoles = [UserRole.EDITOR, UserRole.AUTHOR] as const;

export function canAccessUserAdmin(role: UserRole): boolean {
  return canManageUsers(role);
}

export function getCreatableUserRoles(role: UserRole): UserRole[] {
  if (role === UserRole.SUPER_ADMIN) {
    return Object.values(UserRole);
  }

  return role === UserRole.ADMIN ? [...adminManageableRoles] : [];
}

export function canCreateUser(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  return getCreatableUserRoles(actorRole).includes(targetRole);
}

export function canEditUser(
  actor: UserPolicyActor,
  target: UserPolicyTarget,
): boolean {
  if (!canAccessUserAdmin(actor.role)) {
    return false;
  }

  if (actor.id === target.id) {
    return true;
  }

  return canManageUsers(actor.role, target.role);
}

export function canAssignUserRole(
  actor: UserPolicyActor,
  target: UserPolicyTarget,
  nextRole: UserRole,
): boolean {
  if (actor.id === target.id) {
    return nextRole === target.role;
  }

  return (
    canManageUsers(actor.role, target.role) &&
    canCreateUser(actor.role, nextRole)
  );
}

export function canChangeUserStatus(
  actor: UserPolicyActor,
  target: UserPolicyTarget,
): boolean {
  return (
    actor.id !== target.id && canManageUsers(actor.role, target.role)
  );
}

export function canDeleteUser(
  actor: UserPolicyActor,
  target: UserPolicyTarget,
): boolean {
  return (
    actor.id !== target.id && canManageUsers(actor.role, target.role)
  );
}

export function activeSuperAdminCountAfterChange(
  activeSuperAdminCount: number,
  current: { role: UserRole; status: UserStatus },
  next: { role: UserRole; status: UserStatus } | null,
): number {
  const currentIsActiveSuperAdmin =
    current.role === UserRole.SUPER_ADMIN &&
    current.status === UserStatus.ACTIVE;
  const nextIsActiveSuperAdmin =
    next?.role === UserRole.SUPER_ADMIN &&
    next.status === UserStatus.ACTIVE;

  return (
    activeSuperAdminCount -
    (currentIsActiveSuperAdmin ? 1 : 0) +
    (nextIsActiveSuperAdmin ? 1 : 0)
  );
}

export function preservesActiveSuperAdmin(
  activeSuperAdminCount: number,
  current: { role: UserRole; status: UserStatus },
  next: { role: UserRole; status: UserStatus } | null,
): boolean {
  return activeSuperAdminCountAfterChange(
    activeSuperAdminCount,
    current,
    next,
  ) >= 1;
}
