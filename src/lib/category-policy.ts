import type { UserRole } from "@/generated/prisma/enums";
import {
  canDeleteContent,
  canManageTaxonomy,
} from "@/lib/auth/permissions";

export const canAccessCategoryAdmin = canManageTaxonomy;
export const canCreateCategory = canManageTaxonomy;
export const canEditCategory = canManageTaxonomy;
export const canSetCategoryActive = canManageTaxonomy;
export const canDeleteCategory = canDeleteContent;

export function assertCategoryAdminRole(role: UserRole): boolean {
  return canAccessCategoryAdmin(role);
}
