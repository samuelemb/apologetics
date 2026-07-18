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
import { tagFormSchema, tagQuerySchema } from "@/schemas/tag";
import { getEventFormOptions } from "@/services/event.service";
import { getMagazineFormOptions } from "@/services/magazine.service";
import { getNewsFormOptions, updateNews } from "@/services/news.service";
import {
  TagServiceError,
  createTag,
  deleteTag,
  listTags,
  setTagActive,
} from "@/services/tag.service";

function expectTagError(code: TagServiceError["code"]) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof TagServiceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("tag service enforces PostgreSQL taxonomy workflows and cleans fixtures", async () => {
  const marker = `phase-7-tag-${randomUUID()}`;

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
      tagFormSchema.parse({
        name: `${marker} Topic`,
        slug: "",
        description: "Temporary tag integration fixture",
        isActive: true,
        ...overrides,
      });

    const category = await prisma.category.create({
      data: {
        name: `${marker} General`,
        slug: `${marker}-general`,
        type: CategoryType.GENERAL,
      },
      select: { id: true },
    });
    const tag = await createTag(editorActor, makeInput());
    const stored = await prisma.tag.findUniqueOrThrow({ where: { id: tag.id } });
    assert.equal(stored.slug, `${marker}-topic`);

    await assert.rejects(
      () =>
        createTag(
          editorActor,
          makeInput({
            name: `${marker} Duplicate`,
            slug: `${marker}-topic`,
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof TagServiceError);
        assert.equal(error.code, "DUPLICATE_SLUG");
        assert.equal(error.field, "slug");
        return true;
      },
    );

    const activeListing = await listTags(
      editorActor,
      tagQuerySchema.parse({ search: marker, active: "true", sort: "alphabetical" }),
    );
    assert.equal(activeListing.total, 1);
    assert.equal(activeListing.tags[0].id, tag.id);

    await assert.rejects(
      () => listTags(authorActor, tagQuerySchema.parse({})),
      expectTagError("FORBIDDEN"),
    );
    await assert.rejects(
      () => createTag(authorActor, makeInput({ slug: `${marker}-author` })),
      expectTagError("FORBIDDEN"),
    );

    const [article, event, issue] = await prisma.$transaction([
      prisma.newsArticle.create({
        data: {
          title: `${marker} news`,
          slug: `${marker}-news`,
          content: "Temporary tag fixture",
          authorId: editor.id,
          categoryId: category.id,
          tags: { create: { tagId: tag.id } },
        },
        select: { id: true },
      }),
      prisma.event.create({
        data: {
          title: `${marker} event`,
          slug: `${marker}-event`,
          content: "Temporary tag fixture",
          startAt: new Date("2035-01-01T09:00:00.000Z"),
          endAt: new Date("2035-01-01T10:00:00.000Z"),
          location: "Addis Ababa",
          authorId: editor.id,
          categoryId: category.id,
          tags: { create: { tagId: tag.id } },
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
          tags: { create: { tagId: tag.id } },
        },
        select: { id: true },
      }),
    ]);

    const usedListing = await listTags(
      editorActor,
      tagQuerySchema.parse({ search: marker, usage: "used" }),
    );
    assert.equal(usedListing.total, 1);
    assert.deepEqual(usedListing.tags[0]._count, {
      newsArticles: 1,
      events: 1,
      magazineIssues: 1,
    });

    await setTagActive(editorActor, tag.id, false);
    const inactiveUsedListing = await listTags(
      editorActor,
      tagQuerySchema.parse({ search: marker, active: "false", usage: "used" }),
    );
    assert.equal(inactiveUsedListing.total, 1);

    const [newNewsOptions, newEventOptions, newMagazineOptions] = await Promise.all([
      getNewsFormOptions(),
      getEventFormOptions(),
      getMagazineFormOptions(),
    ]);
    assert.equal(newNewsOptions.tags.some((item) => item.id === tag.id), false);
    assert.equal(newEventOptions.tags.some((item) => item.id === tag.id), false);
    assert.equal(newMagazineOptions.tags.some((item) => item.id === tag.id), false);

    const [editNewsOptions, editEventOptions, editMagazineOptions] = await Promise.all([
      getNewsFormOptions({ tagIds: [tag.id] }),
      getEventFormOptions({ tagIds: [tag.id] }),
      getMagazineFormOptions({ tagIds: [tag.id] }),
    ]);
    assert.equal(editNewsOptions.tags.find((item) => item.id === tag.id)?.isActive, false);
    assert.equal(editEventOptions.tags.find((item) => item.id === tag.id)?.isActive, false);
    assert.equal(editMagazineOptions.tags.find((item) => item.id === tag.id)?.isActive, false);

    await updateNews(editorActor, article.id, {
      title: `${marker} news updated`,
      slug: `${marker}-news`,
      excerpt: "",
      content: "Updated while retaining an inactive tag",
      coverImageUrl: "",
      coverImageAssetId: "",
      coverImageAlt: "",
      categoryId: category.id,
      tagIds: [tag.id],
      status: ContentStatus.DRAFT,
      featured: false,
      publishedAt: "",
      scheduledFor: "",
    });
    assert.equal(
      await prisma.newsArticleTag.count({ where: { newsArticleId: article.id, tagId: tag.id } }),
      1,
    );

    const contentCountsBeforeDelete = await Promise.all([
      prisma.newsArticle.count({ where: { id: article.id } }),
      prisma.event.count({ where: { id: event.id } }),
      prisma.magazineIssue.count({ where: { id: issue.id } }),
    ]);
    await assert.rejects(
      () => deleteTag(superAdminActor, tag.id),
      expectTagError("REFERENCED"),
    );
    assert.deepEqual(
      await Promise.all([
        prisma.newsArticle.count({ where: { id: article.id } }),
        prisma.event.count({ where: { id: event.id } }),
        prisma.magazineIssue.count({ where: { id: issue.id } }),
      ]),
      contentCountsBeforeDelete,
    );

    const unused = await createTag(
      editorActor,
      makeInput({ name: `${marker} Unused`, slug: `${marker}-unused` }),
    );
    const unusedListing = await listTags(
      editorActor,
      tagQuerySchema.parse({ search: marker, usage: "unused" }),
    );
    assert.equal(unusedListing.tags.some((item) => item.id === unused.id), true);
    await assert.rejects(
      () => deleteTag(editorActor, unused.id),
      expectTagError("FORBIDDEN"),
    );
    await deleteTag(superAdminActor, unused.id);
    assert.equal(await prisma.tag.count({ where: { id: unused.id } }), 0);
  } finally {
    await prisma.newsArticle.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.event.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.magazineIssue.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.tag.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.$disconnect();
  }
});
