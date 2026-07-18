import assert from "node:assert/strict";
import test from "node:test";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import {
  canAttachMediaToContent,
  canAuthenticatedUserUploadMedia,
  canClaimPendingMedia,
} from "@/lib/media-policy";

test("9. unauthenticated upload is rejected", () => {
  assert.equal(canAuthenticatedUserUploadMedia(null), false);
});

test("10. suspended user upload is rejected", () => {
  assert.equal(
    canAuthenticatedUserUploadMedia({
      id: "author",
      role: UserRole.AUTHOR,
      status: UserStatus.SUSPENDED,
    }),
    false,
  );
});

test("11. invited user upload is rejected", () => {
  assert.equal(
    canAuthenticatedUserUploadMedia({
      id: "author",
      role: UserRole.AUTHOR,
      status: UserStatus.INVITED,
    }),
    false,
  );
});

test("12. author may upload for their own draft", () => {
  assert.equal(
    canAuthenticatedUserUploadMedia({
      id: "author",
      role: UserRole.AUTHOR,
      status: UserStatus.ACTIVE,
    }),
    true,
  );
  assert.equal(
    canAttachMediaToContent(UserRole.AUTHOR, "author", "author"),
    true,
  );
});

test("13. author cannot attach to another author's content", () => {
  assert.equal(
    canAttachMediaToContent(UserRole.AUTHOR, "author-1", "author-2"),
    false,
  );
});

test("14. editor may upload for permitted content", () => {
  assert.equal(
    canAuthenticatedUserUploadMedia({
      id: "editor",
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
    }),
    true,
  );
});

test("15. unauthorized user cannot discard another user's pending asset", () => {
  assert.equal(
    canClaimPendingMedia(UserRole.EDITOR, "editor", "author"),
    false,
  );
  assert.equal(
    canClaimPendingMedia(UserRole.AUTHOR, "author-1", "author-2"),
    false,
  );
});

test("16. admin-level media policy follows existing permissions", () => {
  assert.equal(
    canClaimPendingMedia(UserRole.ADMIN, "admin", "author"),
    true,
  );
  assert.equal(
    canClaimPendingMedia(UserRole.SUPER_ADMIN, "super-admin", "author"),
    true,
  );
});
