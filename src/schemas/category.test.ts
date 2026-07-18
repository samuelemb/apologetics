import assert from "node:assert/strict";
import test from "node:test";

import { CategoryType } from "@/generated/prisma/enums";
import {
  categoryFormSchema,
  categoryQuerySchema,
  generateCategorySlug,
  normalizeCategoryInput,
} from "@/schemas/category";

test("category schema validates fields and generates normalized slugs", () => {
  const input = categoryFormSchema.parse({
    name: "  Community News  ",
    slug: "",
    description: "  Coverage category  ",
    type: CategoryType.NEWS,
    isActive: true,
  });
  const normalized = normalizeCategoryInput(input);

  assert.equal(normalized.name, "Community News");
  assert.equal(normalized.slug, "community-news");
  assert.equal(normalized.description, "Coverage category");
  assert.equal(generateCategorySlug("Faith & Learning"), "faith-learning");
  assert.equal(
    categoryFormSchema.safeParse({ ...input, slug: "Invalid Slug" }).success,
    false,
  );
});

test("category query schema validates pagination, filters, and sorting", () => {
  const query = categoryQuerySchema.parse({
    page: "2",
    search: "news",
    type: CategoryType.NEWS,
    active: "false",
    sort: "alphabetical",
  });
  assert.equal(query.page, 2);
  assert.equal(query.active, "false");
  assert.equal(categoryQuerySchema.safeParse({ active: "maybe" }).success, false);
  assert.equal(categoryQuerySchema.safeParse({ page: "0" }).success, false);
});
