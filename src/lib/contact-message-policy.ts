import { ContactMessageStatus, UserRole } from "@/generated/prisma/enums";
import { canManageContactMessages } from "@/lib/auth/permissions";

export function canAccessContactMessageAdmin(role: UserRole): boolean {
  return canManageContactMessages(role);
}

export function canUpdateContactMessage(role: UserRole): boolean {
  return canManageContactMessages(role);
}

export function canEditContactMessageNotes(role: UserRole): boolean {
  return canManageContactMessages(role);
}

export function canDeleteContactMessage(
  role: UserRole,
  status: ContactMessageStatus,
): boolean {
  return (
    role === UserRole.SUPER_ADMIN &&
    (status === ContactMessageStatus.ARCHIVED ||
      status === ContactMessageStatus.SPAM)
  );
}
