import assert from "node:assert/strict";
import test from "node:test";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { userCreateSchema, userEditSchema } from "@/schemas/user";

const activeInput = {
  name: "  Development Editor  ",
  email: "  Editor@Example.TEST  ",
  image: "https://example.test/avatar.png",
  role: UserRole.EDITOR,
  status: UserStatus.ACTIVE,
  temporaryPassword: "Temporary123",
};

test("valid active-user creation input is normalized and accepted", () => {
  const result = userCreateSchema.parse(activeInput);

  assert.equal(result.name, "Development Editor");
  assert.equal(result.email, "editor@example.test");
  assert.equal(result.status, UserStatus.ACTIVE);
});

test("invalid email and image URLs are rejected", () => {
  assert.equal(
    userCreateSchema.safeParse({ ...activeInput, email: "invalid" }).success,
    false,
  );
  assert.equal(
    userCreateSchema.safeParse({ ...activeInput, image: "file:///avatar.png" })
      .success,
    false,
  );
});

test("active users require a strong temporary password", () => {
  assert.equal(
    userCreateSchema.safeParse({ ...activeInput, temporaryPassword: "" })
      .success,
    false,
  );
  assert.equal(
    userCreateSchema.safeParse({
      ...activeInput,
      temporaryPassword: "weak-password",
    }).success,
    false,
  );
});

test("invited creation accepts no password and suspended creation is rejected", () => {
  assert.equal(
    userCreateSchema.safeParse({
      ...activeInput,
      status: UserStatus.INVITED,
      temporaryPassword: "",
    }).success,
    true,
  );
  assert.equal(
    userCreateSchema.safeParse({
      ...activeInput,
      status: UserStatus.INVITED,
      temporaryPassword: "Temporary123",
    }).success,
    false,
  );
  assert.equal(
    userCreateSchema.safeParse({
      ...activeInput,
      status: UserStatus.SUSPENDED,
    }).success,
    false,
  );
});

test("unknown roles and statuses are rejected", () => {
  assert.equal(
    userCreateSchema.safeParse({ ...activeInput, role: "OWNER" }).success,
    false,
  );
  assert.equal(
    userEditSchema.safeParse({
      name: activeInput.name,
      email: activeInput.email,
      image: activeInput.image,
      role: activeInput.role,
      status: "DELETED",
    }).success,
    false,
  );
});
