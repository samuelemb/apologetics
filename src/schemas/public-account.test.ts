import assert from "node:assert/strict";
import test from "node:test";

import {
  emailVerificationSchema,
  publicRegistrationSchema,
} from "@/schemas/public-account";

test("public registration normalizes email and enforces password requirements", () => {
  const result = publicRegistrationSchema.parse({
    name: "Reader Example",
    email: " Reader@Example.TEST ",
    password: "StrongPassword12",
    confirmPassword: "StrongPassword12",
  });

  assert.equal(result.email, "reader@example.test");
});

test("public registration rejects mismatched or weak passwords", () => {
  assert.equal(
    publicRegistrationSchema.safeParse({
      name: "Reader Example",
      email: "reader@example.test",
      password: "weak",
      confirmPassword: "different",
    }).success,
    false,
  );
});

test("verification codes must be exactly four digits", () => {
  assert.equal(
    emailVerificationSchema.safeParse({
      email: "reader@example.test",
      code: "1234",
    }).success,
    true,
  );
  assert.equal(
    emailVerificationSchema.safeParse({
      email: "reader@example.test",
      code: "12345",
    }).success,
    false,
  );
});
