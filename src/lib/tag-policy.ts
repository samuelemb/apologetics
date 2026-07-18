import type { UserRole } from "@/generated/prisma/enums";
import {
  canDeleteContent,
  canManageTaxonomy,
} from "@/lib/auth/permissions";

export const canAccessTagAdmin = canManageTaxonomy;
export const canCreateTag = canManageTaxonomy;
export const canEditTag = canManageTaxonomy;
export const canSetTagActive = canManageTaxonomy;
export const canDeleteTag = canDeleteContent;

export function assertTagAdminRole(role: UserRole): boolean {
  return canAccessTagAdmin(role);
}
