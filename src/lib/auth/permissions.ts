import { UserRole, UserStatus } from "@/generated/prisma/enums";

export const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.EDITOR,
  UserRole.AUTHOR,
] as const;

const adminRoleSet = new Set<UserRole>(ADMIN_ROLES);

export function isAdminRole(role: UserRole): boolean {
  return adminRoleSet.has(role);
}

export function isLoginEligible(
  status: UserStatus,
  role: UserRole,
): boolean {
  return status === UserStatus.ACTIVE && isAdminRole(role);
}

export function canManageUsers(
  role: UserRole,
  targetRole?: UserRole,
): boolean {
  if (role === UserRole.SUPER_ADMIN) {
    return true;
  }

  if (role !== UserRole.ADMIN) {
    return false;
  }

  return (
    targetRole === undefined ||
    targetRole === UserRole.EDITOR ||
    targetRole === UserRole.AUTHOR
  );
}

export function canManageContactMessages(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

export function canManageSiteSettings(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

export function canManageTaxonomy(role: UserRole): boolean {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.ADMIN ||
    role === UserRole.EDITOR
  );
}

export function canCreateContent(role: UserRole): boolean {
  return isAdminRole(role);
}

export function canEditContent(
  role: UserRole,
  isOwner: boolean,
): boolean {
  if (role === UserRole.AUTHOR) {
    return isOwner;
  }

  return isAdminRole(role);
}

export function canPublishContent(role: UserRole): boolean {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.ADMIN ||
    role === UserRole.EDITOR
  );
}

export const canArchiveContent = canPublishContent;

export function canDeleteContent(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

export type AdminSection =
  | "dashboard"
  | "news"
  | "events"
  | "magazine"
  | "categories"
  | "tags"
  | "users"
  | "messages"
  | "subscribers"
  | "settings"
  | "analytics";

export function canAccessAdminSection(
  role: UserRole,
  section: AdminSection,
): boolean {
  if (!isAdminRole(role)) {
    return false;
  }

  switch (section) {
    case "categories":
    case "tags":
      return canManageTaxonomy(role);
    case "users":
      return canManageUsers(role);
    case "settings":
      return canManageSiteSettings(role);
    case "messages":
      return canManageContactMessages(role);
    case "subscribers":
    case "analytics":
      return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
    default:
      return true;
  }
}
