import assert from "node:assert/strict";
import test from "node:test";

import { EventStatus, UserRole } from "@/generated/prisma/enums";
import {
  canCreateEvent,
  canDeleteEvent,
  canEditEvent,
  canUseEventStatus,
} from "@/lib/event-policy";

test("authors can create drafts and edit only their own events", () => {
  assert.equal(canCreateEvent(UserRole.AUTHOR), true);
  assert.equal(canUseEventStatus(UserRole.AUTHOR, EventStatus.DRAFT), true);
  assert.equal(canEditEvent(UserRole.AUTHOR, "author-1", "author-1"), true);
  assert.equal(canEditEvent(UserRole.AUTHOR, "author-1", "author-2"), false);
});

test("authors cannot publish, schedule, archive, cancel, or delete", () => {
  assert.equal(canUseEventStatus(UserRole.AUTHOR, EventStatus.PUBLISHED), false);
  assert.equal(canUseEventStatus(UserRole.AUTHOR, EventStatus.SCHEDULED), false);
  assert.equal(canUseEventStatus(UserRole.AUTHOR, EventStatus.ARCHIVED), false);
  assert.equal(canUseEventStatus(UserRole.AUTHOR, EventStatus.CANCELLED), false);
  assert.equal(canDeleteEvent(UserRole.AUTHOR), false);
});

test("editors can publish and cancel but cannot delete", () => {
  assert.equal(canEditEvent(UserRole.EDITOR, "editor", "author"), true);
  assert.equal(canUseEventStatus(UserRole.EDITOR, EventStatus.PUBLISHED), true);
  assert.equal(canUseEventStatus(UserRole.EDITOR, EventStatus.SCHEDULED), true);
  assert.equal(canUseEventStatus(UserRole.EDITOR, EventStatus.ARCHIVED), true);
  assert.equal(canUseEventStatus(UserRole.EDITOR, EventStatus.CANCELLED), true);
  assert.equal(canDeleteEvent(UserRole.EDITOR), false);
});

test("admins and super admins have full event permissions", () => {
  for (const role of [UserRole.ADMIN, UserRole.SUPER_ADMIN]) {
    assert.equal(canCreateEvent(role), true);
    assert.equal(canEditEvent(role, "actor", "author"), true);
    assert.equal(canUseEventStatus(role, EventStatus.PUBLISHED), true);
    assert.equal(canUseEventStatus(role, EventStatus.CANCELLED), true);
    assert.equal(canDeleteEvent(role), true);
  }
});
