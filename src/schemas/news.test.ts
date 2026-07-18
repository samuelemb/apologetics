import assert from "node:assert/strict";
import test from "node:test";

import { ContentStatus } from "@/generated/prisma/enums";
import {
  generateSlug,
  newsFormSchema,
  newsQuerySchema,
  normalizeNewsInput,
} from "@/schemas/news";

const baseInput = {
  title: "A valid news title",
  slug: "",
  excerpt: "Short summary",
  content: "Article body",
  coverImageUrl: "",
  coverImageAssetId: "",
  coverImageAlt: "",
  categoryId: "",
  tagIds: [] as string[],
  status: ContentStatus.DRAFT,
  featured: false,
  publishedAt: "",
  scheduledFor: "",
};

test("slug generation normalizes punctuation and repeated separators", () => {
  assert.equal(
    generateSlug("  Faith, Learning & Community!  "),
    "faith-learning-community",
  );
  assert.equal(generateSlug("መፅሔት"), "article");
});

test("published news defaults to the current time", () => {
  const now = new Date("2030-01-02T03:04:05.000Z");
  const input = newsFormSchema.parse({
    ...baseInput,
    status: ContentStatus.PUBLISHED,
  });
  const normalized = normalizeNewsInput(input, { now });

  assert.equal(normalized.publishedAt?.toISOString(), now.toISOString());
  assert.equal(normalized.scheduledFor, null);
});

test("scheduled news requires a future UTC date", () => {
  const pastResult = newsFormSchema.safeParse({
    ...baseInput,
    status: ContentStatus.SCHEDULED,
    scheduledFor: "2020-01-01T00:00",
  });
  const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  const futureResult = newsFormSchema.safeParse({
    ...baseInput,
    status: ContentStatus.SCHEDULED,
    scheduledFor: future,
  });

  assert.equal(pastResult.success, false);
  assert.equal(futureResult.success, true);
});

test("scheduled date is cleared for non-scheduled content", () => {
  const input = newsFormSchema.parse({
    ...baseInput,
    scheduledFor: "2035-01-01T00:00",
  });
  const normalized = normalizeNewsInput(input);

  assert.equal(normalized.scheduledFor, null);
});

test("archiving preserves an existing published date", () => {
  const publishedAt = new Date("2028-04-05T06:07:00.000Z");
  const input = newsFormSchema.parse({
    ...baseInput,
    status: ContentStatus.ARCHIVED,
  });
  const normalized = normalizeNewsInput(input, { existingPublishedAt: publishedAt });

  assert.equal(normalized.publishedAt?.toISOString(), publishedAt.toISOString());
  assert.ok(normalized.archivedAt instanceof Date);
});

test("query parsing rejects invalid filters and accepts valid pagination", () => {
  assert.equal(newsQuerySchema.safeParse({ status: "REMOVED" }).success, false);
  assert.equal(newsQuerySchema.safeParse({ page: "0" }).success, false);

  const parsed = newsQuerySchema.parse({ page: "2", sort: "oldest" });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.sort, "oldest");
});
