import { ContentStatus, type UserRole } from "@/generated/prisma/enums";
import {
  canArchiveContent,
  canCreateContent,
  canDeleteContent,
  canEditContent,
  canPublishContent,
} from "@/lib/auth/permissions";

export function canCreateNews(role: UserRole): boolean {
  return canCreateContent(role);
}

export function canEditNews(
  role: UserRole,
  actorId: string,
  authorId: string | null,
): boolean {
  return canEditContent(role, authorId === actorId);
}

export function canUseNewsStatus(
  role: UserRole,
  status: ContentStatus,
): boolean {
  switch (status) {
    case ContentStatus.PUBLISHED:
    case ContentStatus.SCHEDULED:
      return canPublishContent(role);
    case ContentStatus.ARCHIVED:
      return canArchiveContent(role);
    case ContentStatus.DRAFT:
      return canCreateContent(role);
  }
}

export function canDeleteNews(role: UserRole): boolean {
  return canDeleteContent(role);
}

