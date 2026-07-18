import assert from "node:assert/strict";
import test from "node:test";

import { credentialsSchema } from "@/schemas/auth";

test("credentials normalize a valid email", () => {
  const result = credentialsSchema.parse({
    email: "  Admin@Example.TEST  ",
    password: "valid-password",
  });

  assert.equal(result.email, "admin@example.test");
  assert.equal(result.password, "valid-password");
});

test("credentials reject invalid email and empty password values", () => {
  const result = credentialsSchema.safeParse({
    email: "not-an-email",
    password: "",
  });

  assert.equal(result.success, false);
});

