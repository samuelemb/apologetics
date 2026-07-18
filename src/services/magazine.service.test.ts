import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

import {
  CategoryType,
  ContentStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  magazineFormSchema,
  magazineQuerySchema,
  type MagazineFormInput,
} from "@/schemas/magazine";
import {
  createMagazineIssue,
  deleteMagazineIssue,
  getMagazineForEdit,
  listMagazineIssues,
  MagazineServiceError,
  updateMagazineIssue,
} from "@/services/magazine.service";

function expectServiceError(code: MagazineServiceError["code"]) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof MagazineServiceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("magazine service enforces PostgreSQL workflows and cleans up fixtures", async () => {
  const marker = `phase-6-${randomUUID()}`;
  const fixtureTitle = `${marker} listing`;

  try {
    const [superAdmin, editor, category, tags] = await Promise.all([
      prisma.user.findFirst({
        where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { role: UserRole.EDITOR, status: UserStatus.ACTIVE },
        select: { id: true },
      }),
      prisma.category.findFirst({
        where: {
          isActive: true,
          type: { in: [CategoryType.MAGAZINE, CategoryType.GENERAL] },
        },
        select: { id: true },
      }),
      prisma.tag.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 2,
        select: { id: true },
      }),
    ]);

    assert.ok(superAdmin, "An active seeded super admin is required.");
    assert.ok(editor, "An active seeded editor is required.");
    assert.ok(category, "An active Magazine or General category is required.");
    assert.equal(tags.length, 2, "At least two active tags are required.");

    const [author, admin] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name: "Phase 6 Author",
          email: `author.${marker}@example.test`,
          passwordHash: "test-fixture-not-for-login",
          role: UserRole.AUTHOR,
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          name: "Phase 6 Admin",
          email: `admin.${marker}@example.test`,
          passwordHash: "test-fixture-not-for-login",
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      }),
    ]);

    const authorActor = { id: author.id, role: UserRole.AUTHOR };
    const editorActor = { id: editor.id, role: UserRole.EDITOR };
    const adminActor = { id: admin.id, role: UserRole.ADMIN };
    const superAdminActor = {
      id: superAdmin.id,
      role: UserRole.SUPER_ADMIN,
    };
    const makeInput = (
      suffix: string,
      overrides: Partial<MagazineFormInput> = {},
    ): MagazineFormInput =>
      magazineFormSchema.parse({
        title: `${marker} ${suffix}`,
        slug: `${marker}-${suffix}`,
        issueNumber: `${marker}-${suffix}`,
        volume: "Volume 6",
        description: "Temporary magazine service fixture.",
        coverImageUrl: "",
        coverImageAssetId: "",
        coverImageAlt: "",
        pdfUrl: `https://example.test/${marker}/${suffix}.pdf`,
        pdfAssetId: "",
        pdfFileName: `${suffix}.pdf`,
        pdfFileSize: "4096",
        pageCount: "64",
        publicationDate: "",
        categoryId: category.id,
        tagIds: [tags[0].id],
        status: ContentStatus.DRAFT,
        featured: false,
        ...overrides,
      });

    const authorIssue = await createMagazineIssue(
      authorActor,
      makeInput("author-draft"),
    );
    const storedAuthorIssue = await prisma.magazineIssue.findUniqueOrThrow({
      where: { id: authorIssue.id },
      select: { authorId: true, status: true },
    });
    assert.equal(storedAuthorIssue.authorId, author.id);
    assert.equal(storedAuthorIssue.status, ContentStatus.DRAFT);

    await assert.rejects(
      () =>
        createMagazineIssue(
          authorActor,
          makeInput("author-published", {
            status: ContentStatus.PUBLISHED,
            publicationDate: "2035-06-10",
          }),
        ),
      expectServiceError("FORBIDDEN"),
    );

    const editorIssue = await createMagazineIssue(
      editorActor,
      makeInput("editor-published", {
        status: ContentStatus.PUBLISHED,
        publicationDate: "2035-07-10",
      }),
    );
    await assert.rejects(
      () =>
        updateMagazineIssue(
          authorActor,
          editorIssue.id,
          makeInput("cross-edit"),
        ),
      expectServiceError("FORBIDDEN"),
    );
    await updateMagazineIssue(
      editorActor,
      editorIssue.id,
      makeInput("editor-published", {
        status: ContentStatus.ARCHIVED,
        publicationDate: "2035-07-10",
      }),
    );
    assert.equal(
      (
        await prisma.magazineIssue.findUniqueOrThrow({
          where: { id: editorIssue.id },
          select: { status: true },
        })
      ).status,
      ContentStatus.ARCHIVED,
    );
    await assert.rejects(
      () => deleteMagazineIssue(editorActor, editorIssue.id),
      expectServiceError("FORBIDDEN"),
    );

    const scheduledInput = {
      ...makeInput("unsupported-schedule"),
      status: ContentStatus.SCHEDULED,
    };
    await assert.rejects(
      () => createMagazineIssue(superAdminActor, scheduledInput),
      expectServiceError("FORBIDDEN"),
    );

    const adminIssue = await createMagazineIssue(
      adminActor,
      makeInput("admin-delete"),
    );
    await deleteMagazineIssue(adminActor, adminIssue.id);
    assert.equal(
      await prisma.magazineIssue.count({ where: { id: adminIssue.id } }),
      0,
    );

    const superAdminIssue = await createMagazineIssue(
      superAdminActor,
      makeInput("super-admin-delete"),
    );
    await deleteMagazineIssue(superAdminActor, superAdminIssue.id);
    assert.equal(
      await prisma.magazineIssue.count({ where: { id: superAdminIssue.id } }),
      0,
    );

    await createMagazineIssue(editorActor, makeInput("duplicate-slug-source"));
    await assert.rejects(
      () =>
        createMagazineIssue(
          editorActor,
          makeInput("duplicate-slug-second", {
            slug: `${marker}-duplicate-slug-source`,
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof MagazineServiceError);
        assert.equal(error.code, "DUPLICATE_SLUG");
        assert.equal(error.field, "slug");
        return true;
      },
    );

    await createMagazineIssue(editorActor, makeInput("duplicate-number-source"));
    await assert.rejects(
      () =>
        createMagazineIssue(
          editorActor,
          makeInput("duplicate-number-second", {
            issueNumber: `${marker}-duplicate-number-source`,
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof MagazineServiceError);
        assert.equal(error.code, "DUPLICATE_ISSUE_NUMBER");
        assert.equal(error.field, "issueNumber");
        return true;
      },
    );

    await prisma.magazineIssue.update({
      where: { id: authorIssue.id },
      data: { viewCount: 37, downloadCount: 11 },
    });
    await updateMagazineIssue(
      authorActor,
      authorIssue.id,
      makeInput("author-updated", {
        tagIds: tags.map((tag) => tag.id),
      }),
    );
    const [editValues, updatedCounters] = await Promise.all([
      getMagazineForEdit(authorIssue.id),
      prisma.magazineIssue.findUniqueOrThrow({
        where: { id: authorIssue.id },
        select: { viewCount: true, downloadCount: true },
      }),
    ]);
    assert.ok(editValues);
    assert.equal(editValues.categoryId, category.id);
    assert.deepEqual(
      new Set(editValues.tagIds),
      new Set(tags.map((tag) => tag.id)),
    );
    assert.deepEqual(updatedCounters, { viewCount: 37, downloadCount: 11 });

    await prisma.magazineIssue.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        title: `${fixtureTitle} ${String(index + 1).padStart(2, "0")}`,
        slug: `${marker}-listing-${String(index + 1).padStart(2, "0")}`,
        issueNumber: `${marker}-listing-${String(index + 1).padStart(2, "0")}`,
        pdfUrl: `https://example.test/${marker}/listing-${index + 1}.pdf`,
        pdfFileName: `listing-${index + 1}.pdf`,
        categoryId: category.id,
        authorId: editor.id,
        status: ContentStatus.DRAFT,
        featured: index % 2 === 0,
        publicationDate: new Date(Date.UTC(2040, 0, index + 1)),
        createdAt: new Date(Date.UTC(2030, 0, index + 1, 9)),
        viewCount: index,
        downloadCount: index * 2,
      })),
    });

    const newest = await listMagazineIssues(
      magazineQuerySchema.parse({ search: fixtureTitle, sort: "newest" }),
    );
    assert.equal(newest.total, 12);
    assert.equal(newest.issues.length, 10);
    assert.equal(newest.totalPages, 2);
    assert.match(newest.issues[0].title, /12$/);

    const secondPage = await listMagazineIssues(
      magazineQuerySchema.parse({
        search: fixtureTitle,
        sort: "newest",
        page: "2",
      }),
    );
    assert.equal(secondPage.issues.length, 2);

    const oldest = await listMagazineIssues(
      magazineQuerySchema.parse({ search: fixtureTitle, sort: "oldest" }),
    );
    assert.match(oldest.issues[0].title, /01$/);

    const byPublication = await listMagazineIssues(
      magazineQuerySchema.parse({ search: fixtureTitle, sort: "publication" }),
    );
    assert.match(byPublication.issues[0].title, /12$/);

    const byStatus = await listMagazineIssues(
      magazineQuerySchema.parse({
        search: fixtureTitle,
        status: ContentStatus.DRAFT,
      }),
    );
    assert.equal(byStatus.total, 12);

    const byCategory = await listMagazineIssues(
      magazineQuerySchema.parse({ search: fixtureTitle, category: category.id }),
    );
    assert.equal(byCategory.total, 12);

    const featured = await listMagazineIssues(
      magazineQuerySchema.parse({ search: fixtureTitle, featured: "true" }),
    );
    const notFeatured = await listMagazineIssues(
      magazineQuerySchema.parse({ search: fixtureTitle, featured: "false" }),
    );
    assert.equal(featured.total, 6);
    assert.equal(notFeatured.total, 6);
  } finally {
    await prisma.magazineIssue.deleteMany({
      where: { slug: { startsWith: marker } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `.${marker}@example.test` } },
    });
    await prisma.$disconnect();
  }
});
