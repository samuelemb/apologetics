import assert from "node:assert/strict";
import test from "node:test";

import { ContactMessageStatus, UserRole } from "@/generated/prisma/enums";
import {
  canAccessContactMessageAdmin,
  canDeleteContactMessage,
  canEditContactMessageNotes,
  canUpdateContactMessage,
} from "@/lib/contact-message-policy";

test("super admins and admins can view and manage contact messages", () => {
  for (const role of [UserRole.SUPER_ADMIN, UserRole.ADMIN]) {
    assert.equal(canAccessContactMessageAdmin(role), true);
    assert.equal(canUpdateContactMessage(role), true);
    assert.equal(canEditContactMessageNotes(role), true);
  }
});

test("editors and authors cannot access or mutate contact messages", () => {
  for (const role of [UserRole.EDITOR, UserRole.AUTHOR]) {
    assert.equal(canAccessContactMessageAdmin(role), false);
    assert.equal(canUpdateContactMessage(role), false);
    assert.equal(canEditContactMessageNotes(role), false);
    assert.equal(canDeleteContactMessage(role, ContactMessageStatus.ARCHIVED), false);
  }
});

test("only super admins can delete archived or spam messages", () => {
  for (const status of Object.values(ContactMessageStatus)) {
    const eligible =
      status === ContactMessageStatus.ARCHIVED ||
      status === ContactMessageStatus.SPAM;
    assert.equal(canDeleteContactMessage(UserRole.SUPER_ADMIN, status), eligible);
    assert.equal(canDeleteContactMessage(UserRole.ADMIN, status), false);
  }
});
