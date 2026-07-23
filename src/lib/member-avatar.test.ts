import assert from "node:assert/strict";
import test from "node:test";

import { getMemberInitials } from "@/lib/member-avatar";

test("getMemberInitials returns up to two initials", () => {
  assert.equal(getMemberInitials("Samuel Embaye"), "SE");
  assert.equal(getMemberInitials("  Samuel   Amanuel Embaye  "), "SA");
});

test("getMemberInitials uses a safe fallback", () => {
  assert.equal(getMemberInitials(""), "A");
  assert.equal(getMemberInitials("  "), "A");
});
