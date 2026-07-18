import type { UserRole, UserStatus } from "@/generated/prisma/enums";
import {
  canCreateContent,
  canEditContent,
  isLoginEligible,
} from "@/lib/auth/permissions";

type MediaPolicyUser = {
  id: string;
  role: UserRole;
  status: UserStatus;
};

export function canAuthenticatedUserUploadMedia(
  user: MediaPolicyUser | null,
): boolean {
  return Boolean(
    user && isLoginEligible(user.status, user.role) && canUploadMedia(user.role),
  );
}

export function canUploadMedia(role: UserRole): boolean {
  return canCreateContent(role);
}

export function canClaimPendingMedia(
  role: UserRole,
  actorId: string,
  uploadedById: string | null,
): boolean {
  if (uploadedById === actorId) return canUploadMedia(role);
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAttachMediaToContent(
  role: UserRole,
  actorId: string,
  authorId: string | null,
): boolean {
  return canEditContent(role, actorId === authorId);
}
