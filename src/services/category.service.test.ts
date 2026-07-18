import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  CategoryType,
  ContentStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { categoryFormSchema, categoryQuerySchema } from "@/schemas/category";
import {
  CategoryServiceError,
  createCategory,
  deleteCategory,
  listCategories,
  setCategoryActive,
} from "@/services/category.service";
import { getEventFormOptions } from "@/services/event.service";
import { getMagazineFormOptions } from "@/services/magazine.service";
import { getNewsFormOptions, updateNews } from "@/services/news.service";

function expectCategoryError(code: CategoryServiceError["code"]) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof CategoryServiceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("category service enforces PostgreSQL taxonomy workflows and cleans fixtures", async () => {
  const marker = `phase-7-category-${randomUUID()}`;

  try {
    const [superAdmin, editor] = await Promise.all([
      prisma.user.findFirst({
        where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { role: UserRole.EDITOR, status: UserStatus.ACTIVE },
        select: { id: true },
      }),
    ]);
    assert.ok(superAdmin, "An active seeded super admin is required.");
    assert.ok(editor, "An active seeded editor is required.");

    const superAdminActor = { id: superAdmin.id, role: UserRole.SUPER_ADMIN };
    const editorActor = { id: editor.id, role: UserRole.EDITOR };
    const authorActor = { id: editor.id, role: UserRole.AUTHOR };
    const makeInput = (overrides: Record<string, unknown> = {}) =>
      categoryFormSchema.parse({
        name: `${marker} General`,
        slug: "",
        description: "Temporary category integration fixture",
        type: CategoryType.GENERAL,
        isActive: true,
        ...overrides,
      });

    const category = await createCategory(editorActor, makeInput());
    const stored = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    assert.equal(stored.slug, `${marker}-general`);
    assert.equal(stored.isActive, true);

    await assert.rejects(
      () =>
        createCategory(
          editorActor,
          makeInput({
            name: `${marker} Duplicate`,
            slug: `${marker}-general`,
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof CategoryServiceError);
        assert.equal(error.code, "DUPLICATE_SLUG");
        assert.equal(error.field, "slug");
        return true;
      },
    );

    const activeListing = await listCategories(
      editorActor,
      categoryQuerySchema.parse({
        search: marker,
        type: CategoryType.GENERAL,
        active: "true",
        sort: "alphabetical",
      }),
    );
    assert.equal(activeListing.total, 1);
    assert.equal(activeListing.categories[0].id, category.id);

    await assert.rejects(
      () => listCategories(authorActor, categoryQuerySchema.parse({})),
      expectCategoryError("FORBIDDEN"),
    );
    await assert.rejects(
      () => createCategory(authorActor, makeInput({ slug: `${marker}-author` })),
      expectCategoryError("FORBIDDEN"),
    );

    const [article, event, issue] = await prisma.$transaction([
      prisma.newsArticle.create({
        data: {
          title: `${marker} news`,
          slug: `${marker}-news`,
          content: "Temporary category fixture",
          authorId: editor.id,
          categoryId: category.id,
        },
        select: { id: true },
      }),
      prisma.event.create({
        data: {
          title: `${marker} event`,
          slug: `${marker}-event`,
          content: "Temporary category fixture",
          startAt: new Date("2035-01-01T09:00:00.000Z"),
          endAt: new Date("2035-01-01T10:00:00.000Z"),
          location: "Addis Ababa",
          authorId: editor.id,
          categoryId: category.id,
        },
        select: { id: true },
      }),
      prisma.magazineIssue.create({
        data: {
          title: `${marker} magazine`,
          slug: `${marker}-magazine`,
          issueNumber: `${marker}-issue`,
          pdfUrl: "https://example.test/fixture.pdf",
          authorId: editor.id,
          categoryId: category.id,
        },
        select: { id: true },
      }),
    ]);

    const counted = await listCategories(
      editorActor,
      categoryQuerySchema.parse({ search: marker }),
    );
    assert.equal(counted.categories[0]._count.newsArticles, 1);
    assert.equal(counted.categories[0]._count.events, 1);
    assert.equal(counted.categories[0]._count.magazineIssues, 1);

    await setCategoryActive(editorActor, category.id, false);
    const inactiveListing = await listCategories(
      editorActor,
      categoryQuerySchema.parse({ search: marker, active: "false" }),
    );
    assert.equal(inactiveListing.total, 1);

    const [newNewsOptions, newEventOptions, newMagazineOptions] = await Promise.all([
      getNewsFormOptions(),
      getEventFormOptions(),
      getMagazineFormOptions(),
    ]);
    assert.equal(newNewsOptions.categories.some((item) => item.id === category.id), false);
    assert.equal(newEventOptions.categories.some((item) => item.id === category.id), false);
    assert.equal(newMagazineOptions.categories.some((item) => item.id === category.id), false);

    const [editNewsOptions, editEventOptions, editMagazineOptions] = await Promise.all([
      getNewsFormOptions({ categoryId: category.id }),
      getEventFormOptions({ categoryId: category.id }),
      getMagazineFormOptions({ categoryId: category.id }),
    ]);
    assert.equal(editNewsOptions.categories.find((item) => item.id === category.id)?.isActive, false);
    assert.equal(editEventOptions.categories.find((item) => item.id === category.id)?.isActive, false);
    assert.equal(editMagazineOptions.categories.find((item) => item.id === category.id)?.isActive, false);

    await updateNews(editorActor, article.id, {
      title: `${marker} news updated`,
      slug: `${marker}-news`,
      excerpt: "",
      content: "Updated while retaining an inactive category",
      coverImageUrl: "",
      coverImageAssetId: "",
      coverImageAlt: "",
      categoryId: category.id,
      tagIds: [],
      status: ContentStatus.DRAFT,
      featured: false,
      publishedAt: "",
      scheduledFor: "",
    });
    assert.equal(
      (await prisma.newsArticle.findUniqueOrThrow({ where: { id: article.id } })).categoryId,
      category.id,
    );

    const contentCountsBeforeDelete = await Promise.all([
      prisma.newsArticle.count({ where: { id: article.id } }),
      prisma.event.count({ where: { id: event.id } }),
      prisma.magazineIssue.count({ where: { id: issue.id } }),
    ]);
    await assert.rejects(
      () => deleteCategory(superAdminActor, category.id),
      expectCategoryError("REFERENCED"),
    );
    assert.deepEqual(
      await Promise.all([
        prisma.newsArticle.count({ where: { id: article.id } }),
        prisma.event.count({ where: { id: event.id } }),
        prisma.magazineIssue.count({ where: { id: issue.id } }),
      ]),
      contentCountsBeforeDelete,
    );

    const unused = await createCategory(
      editorActor,
      makeInput({ name: `${marker} Unused`, slug: `${marker}-unused` }),
    );
    await assert.rejects(
      () => deleteCategory(editorActor, unused.id),
      expectCategoryError("FORBIDDEN"),
    );
    await deleteCategory(superAdminActor, unused.id);
    assert.equal(await prisma.category.count({ where: { id: unused.id } }), 0);
  } finally {
    await prisma.newsArticle.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.event.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.magazineIssue.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.$disconnect();
  }
});
