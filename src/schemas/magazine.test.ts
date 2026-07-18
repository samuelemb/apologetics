import assert from "node:assert/strict";
import test from "node:test";

import { ContentStatus } from "@/generated/prisma/enums";
import {
  generateMagazineSlug,
  magazineFormSchema,
  magazineQuerySchema,
  normalizeMagazineInput,
} from "@/schemas/magazine";

const baseInput = {
  title: "Faith and learning magazine",
  slug: "",
  issueNumber: "ISSUE-2026-01",
  volume: "Volume 1",
  description: "A development magazine issue.",
  coverImageUrl: "",
  coverImageAssetId: "",
  coverImageAlt: "",
  pdfUrl: "https://example.test/issues/issue-2026-01.pdf",
  pdfAssetId: "",
  pdfFileName: "issue-2026-01.pdf",
  pdfFileSize: "2048",
  pageCount: "48",
  publicationDate: "",
  categoryId: "",
  tagIds: [] as string[],
  status: ContentStatus.DRAFT,
  featured: false,
};

test("magazine schema accepts valid draft and published issues", () => {
  assert.equal(magazineFormSchema.safeParse(baseInput).success, true);
  assert.equal(
    magazineFormSchema.safeParse({
      ...baseInput,
      status: ContentStatus.PUBLISHED,
      publicationDate: "2035-06-10",
    }).success,
    true,
  );
});

test("published magazine requires a publication date", () => {
  assert.equal(
    magazineFormSchema.safeParse({
      ...baseInput,
      status: ContentStatus.PUBLISHED,
    }).success,
    false,
  );
});

test("cover URL and alt text are validated together", () => {
  assert.equal(
    magazineFormSchema.safeParse({
      ...baseInput,
      coverImageUrl: "not-a-url",
      coverImageAlt: "Cover",
    }).success,
    false,
  );
  assert.equal(
    magazineFormSchema.safeParse({
      ...baseInput,
      coverImageUrl: "https://example.test/cover.jpg",
      coverImageAlt: "",
    }).success,
    false,
  );
});

test("PDF URL and file name are required and validated", () => {
  assert.equal(
    magazineFormSchema.safeParse({ ...baseInput, pdfUrl: "invalid" }).success,
    false,
  );
  assert.equal(
    magazineFormSchema.safeParse({ ...baseInput, pdfFileName: "" }).success,
    false,
  );
  assert.equal(
    magazineFormSchema.safeParse({
      ...baseInput,
      pdfUrl: "javascript:alert(1)",
    }).success,
    false,
  );
});

test("PDF size and page count enforce bounded integers", () => {
  for (const pdfFileSize of ["-1", "2.5", "many", "2147483648"]) {
    assert.equal(
      magazineFormSchema.safeParse({ ...baseInput, pdfFileSize }).success,
      false,
    );
  }
  for (const pageCount of ["-1", "0", "2.5", "2147483648"]) {
    assert.equal(
      magazineFormSchema.safeParse({ ...baseInput, pageCount }).success,
      false,
    );
  }
});

test("invalid publication dates and unsupported scheduling are rejected", () => {
  assert.equal(
    magazineFormSchema.safeParse({
      ...baseInput,
      publicationDate: "2035-02-30",
    }).success,
    false,
  );
  const scheduled = magazineFormSchema.safeParse({
    ...baseInput,
    status: ContentStatus.SCHEDULED,
  });
  assert.equal(scheduled.success, false);
  if (!scheduled.success) {
    assert.match(scheduled.error.issues[0].message, /not supported/i);
  }
});

test("magazine normalization converts numeric strings and generates a slug", () => {
  const parsed = magazineFormSchema.parse(baseInput);
  const normalized = normalizeMagazineInput(parsed);

  assert.equal(normalized.slug, "faith-and-learning-magazine");
  assert.equal(normalized.pdfFileSize, 2048);
  assert.equal(normalized.pageCount, 48);
  assert.equal(normalized.publicationDate, null);
  assert.equal(generateMagazineSlug(" Volume 2: Faith & Learning "), "volume-2-faith-learning");
});

test("magazine query validation covers pagination and listing filters", () => {
  assert.equal(magazineQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(magazineQuerySchema.safeParse({ featured: "yes" }).success, false);
  assert.equal(magazineQuerySchema.safeParse({ sort: "downloads" }).success, false);

  const query = magazineQuerySchema.parse({
    page: "2",
    featured: "true",
    sort: "publication",
  });
  assert.equal(query.page, 2);
  assert.equal(query.featured, "true");
  assert.equal(query.sort, "publication");
});
