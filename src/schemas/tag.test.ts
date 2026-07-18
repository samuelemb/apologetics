import assert from "node:assert/strict";
import test from "node:test";

import {
  generateTagSlug,
  normalizeTagInput,
  tagFormSchema,
  tagQuerySchema,
} from "@/schemas/tag";

test("tag schema validates fields and generates normalized slugs", () => {
  const input = tagFormSchema.parse({
    name: "  Community Learning  ",
    slug: "",
    description: "  Reusable topic  ",
    isActive: true,
  });
  const normalized = normalizeTagInput(input);

  assert.equal(normalized.name, "Community Learning");
  assert.equal(normalized.slug, "community-learning");
  assert.equal(normalized.description, "Reusable topic");
  assert.equal(generateTagSlug("Faith & Reason"), "faith-reason");
  assert.equal(tagFormSchema.safeParse({ ...input, slug: "Bad Slug" }).success, false);
});

test("tag query schema validates filters and sorting", () => {
  const query = tagQuerySchema.parse({
    page: "3",
    search: "faith",
    active: "true",
    usage: "used",
    sort: "oldest",
  });
  assert.equal(query.page, 3);
  assert.equal(query.usage, "used");
  assert.equal(tagQuerySchema.safeParse({ usage: "sometimes" }).success, false);
  assert.equal(tagQuerySchema.safeParse({ sort: "popular" }).success, false);
});
