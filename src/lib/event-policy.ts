import { EventStatus, type UserRole } from "@/generated/prisma/enums";
import {
  canArchiveContent,
  canCreateContent,
  canDeleteContent,
  canEditContent,
  canPublishContent,
} from "@/lib/auth/permissions";

export function canCreateEvent(role: UserRole): boolean {
  return canCreateContent(role);
}

export function canEditEvent(
  role: UserRole,
  actorId: string,
  authorId: string | null,
): boolean {
  return canEditContent(role, actorId === authorId);
}

export function canUseEventStatus(
  role: UserRole,
  status: EventStatus,
): boolean {
  switch (status) {
    case EventStatus.PUBLISHED:
    case EventStatus.SCHEDULED:
      return canPublishContent(role);
    case EventStatus.ARCHIVED:
    case EventStatus.CANCELLED:
      return canArchiveContent(role);
    case EventStatus.DRAFT:
      return canCreateContent(role);
  }
}

export function canDeleteEvent(role: UserRole): boolean {
  return canDeleteContent(role);
}

