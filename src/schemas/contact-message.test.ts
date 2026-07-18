import assert from "node:assert/strict";
import test from "node:test";

import { ContactMessageStatus } from "@/generated/prisma/enums";
import {
  contactMessageActionSchema,
  contactMessageIdSchema,
  contactMessageNotesSchema,
  contactMessageQuerySchema,
} from "@/schemas/contact-message";

test("contact message listing query accepts supported filters", () => {
  assert.deepEqual(
    contactMessageQuerySchema.parse({
      page: "2",
      search: "  inquiry  ",
      status: ContactMessageStatus.NEW,
      from: "2026-07-01",
      to: "2026-07-31",
      sort: "alphabetical",
    }),
    {
      page: 2,
      search: "inquiry",
      status: ContactMessageStatus.NEW,
      from: "2026-07-01",
      to: "2026-07-31",
      sort: "alphabetical",
    },
  );
});

test("contact message listing query rejects invalid filters", () => {
  assert.equal(contactMessageQuerySchema.safeParse({ status: "OPEN" }).success, false);
  assert.equal(contactMessageQuerySchema.safeParse({ sort: "priority" }).success, false);
  assert.equal(contactMessageQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(contactMessageQuerySchema.safeParse({ page: "not-a-number" }).success, false);
  assert.equal(contactMessageQuerySchema.safeParse({ from: "2026-02-30" }).success, false);
  assert.equal(
    contactMessageQuerySchema.safeParse({ from: "2026-08-01", to: "2026-07-01" }).success,
    false,
  );
});

test("contact message notes and IDs are validated", () => {
  assert.equal(contactMessageNotesSchema.parse({ adminNotes: "  line one\nline two  " }).adminNotes, "line one\nline two");
  assert.equal(contactMessageNotesSchema.safeParse({ adminNotes: "x".repeat(5_001) }).success, false);
  assert.equal(contactMessageIdSchema.safeParse("").success, false);
  assert.equal(contactMessageIdSchema.safeParse("invalid id").success, false);
  assert.equal(contactMessageIdSchema.safeParse("seed-contact-user@example.test").success, true);
});

test("only explicit contact message actions are accepted", () => {
  for (const action of ["read", "replied", "archive", "spam", "restore"]) {
    assert.equal(contactMessageActionSchema.safeParse(action).success, true);
  }
  assert.equal(contactMessageActionSchema.safeParse("delete-all").success, false);
});
