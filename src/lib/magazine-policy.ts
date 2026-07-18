import { ContentStatus, type UserRole } from "@/generated/prisma/enums";
import {
  canArchiveContent,
  canCreateContent,
  canDeleteContent,
  canEditContent,
  canPublishContent,
} from "@/lib/auth/permissions";

export function canCreateMagazine(role: UserRole): boolean {
  return canCreateContent(role);
}

export function canEditMagazine(
  role: UserRole,
  actorId: string,
  authorId: string | null,
  currentStatus: ContentStatus,
): boolean {
  if (role === "AUTHOR") {
    return authorId === actorId && currentStatus === ContentStatus.DRAFT;
  }

  return canEditContent(role, authorId === actorId);
}

export function canUseMagazineStatus(
  role: UserRole,
  status: ContentStatus,
): boolean {
  switch (status) {
    case ContentStatus.PUBLISHED:
      return canPublishContent(role);
    case ContentStatus.ARCHIVED:
      return canArchiveContent(role);
    case ContentStatus.DRAFT:
      return canCreateContent(role);
    case ContentStatus.SCHEDULED:
      return false;
  }
}

export function canDeleteMagazine(role: UserRole): boolean {
  return canDeleteContent(role);
}
