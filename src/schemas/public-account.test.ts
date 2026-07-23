import assert from "node:assert/strict";
import test from "node:test";

import {
  emailVerificationSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  publicProfileSchema,
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

test("public profile updates require a valid display name", () => {
  assert.equal(publicProfileSchema.safeParse({ name: "Updated Reader" }).success, true);
  assert.equal(publicProfileSchema.safeParse({ name: " " }).success, false);
});

test("public profile validates usernames, bios, and timezones", () => {
  assert.equal(publicProfileSchema.safeParse({ name: "Reader", username: "reader_1", bio: "A short introduction.", timezone: "Africa/Nairobi" }).success, true);
  assert.equal(publicProfileSchema.safeParse({ name: "Reader", username: "Admin" }).success, false);
  assert.equal(publicProfileSchema.safeParse({ name: "Reader", username: "too short" }).success, false);
  assert.equal(publicProfileSchema.safeParse({ name: "Reader", bio: "a".repeat(161) }).success, false);
  assert.equal(publicProfileSchema.safeParse({ name: "Reader", timezone: "Not/A-Timezone" }).success, false);
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

test("password reset requests normalize email addresses", () => {
  const result = passwordResetRequestSchema.parse({ email: " Reader@Example.TEST " });
  assert.equal(result.email, "reader@example.test");
});

test("password resets require a verified authorization and matching strong passwords", () => {
  const input = { token: "a".repeat(43), password: "StrongPassword12", confirmPassword: "StrongPassword12" };
  assert.equal(passwordResetSchema.safeParse(input).success, true);
  assert.equal(passwordResetSchema.safeParse({ ...input, confirmPassword: "DifferentPassword12" }).success, false);
  assert.equal(passwordResetSchema.safeParse({ ...input, token: "short" }).success, false);
});
