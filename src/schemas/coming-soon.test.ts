import assert from "node:assert/strict";
import test from "node:test";

import { comingSoonQuerySchema } from "@/schemas/coming-soon";

test("coming soon query normalizes approved feature keys", () => {
  assert.equal(
    comingSoonQuerySchema.parse({ feature: " Privacy_Policy " }).feature,
    "privacy-policy",
  );
  assert.equal(
    comingSoonQuerySchema.parse({ feature: ["VIDEOS", "donate"] }).feature,
    "videos",
  );
});

test("coming soon query rejects unknown feature keys", () => {
  assert.equal(
    comingSoonQuerySchema.safeParse({ feature: "<script>alert(1)</script>" })
      .success,
    false,
  );
  assert.equal(
    comingSoonQuerySchema.safeParse({ feature: "unapproved-feature" }).success,
    false,
  );
});
