import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import {
  CategoryType,
  EventStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  eventFormSchema,
  eventQuerySchema,
  type EventFormInput,
} from "@/schemas/event";
import {
  createEvent,
  deleteEvent,
  EventServiceError,
  getEventForEdit,
  listEvents,
  updateEvent,
} from "@/services/event.service";

function expectServiceError(code: EventServiceError["code"]) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof EventServiceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("event service enforces PostgreSQL workflows and cleans up fixtures", async () => {
  const marker = `phase-5-${randomUUID()}`;
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
          type: { in: [CategoryType.EVENT, CategoryType.GENERAL] },
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
    assert.ok(category, "An active Event or General category is required.");
    assert.equal(tags.length, 2, "At least two active tags are required.");

    const [author, admin] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name: "Phase 5 Author",
          email: `author.${marker}@example.test`,
          passwordHash: "test-fixture-not-for-login",
          role: UserRole.AUTHOR,
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          name: "Phase 5 Admin",
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
      overrides: Partial<EventFormInput> = {},
    ): EventFormInput =>
      eventFormSchema.parse({
        title: `${marker} ${suffix}`,
        slug: `${marker}-${suffix}`,
        summary: "Temporary event service fixture",
        content: "Temporary event service fixture content",
        coverImageUrl: "",
        coverImageAssetId: "",
        coverImageAlt: "",
        categoryId: category.id,
        tagIds: [tags[0].id],
        status: EventStatus.DRAFT,
        featured: false,
        startAt: "2035-07-20T09:00",
        endAt: "2035-07-20T11:00",
        location: "Addis Ababa",
        isOnline: false,
        onlineUrl: "",
        registrationUrl: "",
        registrationDeadline: "2035-07-19T09:00",
        capacity: "50",
        publishedAt: "",
        scheduledFor: "",
        ...overrides,
      });

    const authorEvent = await createEvent(authorActor, makeInput("author-draft"));
    const storedAuthorEvent = await prisma.event.findUniqueOrThrow({
      where: { id: authorEvent.id },
      select: { authorId: true, status: true },
    });
    assert.equal(storedAuthorEvent.authorId, author.id);
    assert.equal(storedAuthorEvent.status, EventStatus.DRAFT);

    await assert.rejects(
      () =>
        createEvent(
          authorActor,
          makeInput("author-published", { status: EventStatus.PUBLISHED }),
        ),
      expectServiceError("FORBIDDEN"),
    );

    const editorEvent = await createEvent(
      editorActor,
      makeInput("editor-published", { status: EventStatus.PUBLISHED }),
    );
    await assert.rejects(
      () => updateEvent(authorActor, editorEvent.id, makeInput("cross-edit")),
      expectServiceError("FORBIDDEN"),
    );
    await updateEvent(
      editorActor,
      editorEvent.id,
      makeInput("editor-cancelled", { status: EventStatus.CANCELLED }),
    );
    const cancelledEvent = await prisma.event.findUniqueOrThrow({
      where: { id: editorEvent.id },
      select: { status: true, publishedAt: true },
    });
    assert.equal(cancelledEvent.status, EventStatus.CANCELLED);
    assert.ok(cancelledEvent.publishedAt);
    await assert.rejects(
      () => deleteEvent(editorActor, editorEvent.id),
      expectServiceError("FORBIDDEN"),
    );

    const adminEvent = await createEvent(adminActor, makeInput("admin-delete"));
    await deleteEvent(adminActor, adminEvent.id);
    assert.equal(await prisma.event.count({ where: { id: adminEvent.id } }), 0);

    const superAdminEvent = await createEvent(
      superAdminActor,
      makeInput("super-admin-delete"),
    );
    await deleteEvent(superAdminActor, superAdminEvent.id);
    assert.equal(
      await prisma.event.count({ where: { id: superAdminEvent.id } }),
      0,
    );

    await createEvent(editorActor, makeInput("duplicate-slug"));
    await assert.rejects(
      () => createEvent(editorActor, makeInput("duplicate-slug")),
      (error: unknown) => {
        assert.ok(error instanceof EventServiceError);
        assert.equal(error.code, "DUPLICATE_SLUG");
        assert.equal(error.field, "slug");
        return true;
      },
    );

    await updateEvent(
      authorActor,
      authorEvent.id,
      makeInput("author-updated", { tagIds: tags.map((tag) => tag.id) }),
    );
    const editValues = await getEventForEdit(authorEvent.id);
    assert.ok(editValues);
    assert.equal(editValues.categoryId, category.id);
    assert.deepEqual(new Set(editValues.tagIds), new Set(tags.map((tag) => tag.id)));

    await prisma.event.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        title: `${fixtureTitle} ${String(index + 1).padStart(2, "0")}`,
        slug: `${marker}-listing-${String(index + 1).padStart(2, "0")}`,
        content: "Pagination and filter fixture",
        categoryId: category.id,
        authorId: editor.id,
        status: EventStatus.DRAFT,
        isOnline: index % 2 === 0,
        onlineUrl: index % 2 === 0 ? "https://example.test/room" : null,
        location: index % 2 === 0 ? null : "Addis Ababa",
        startAt: new Date(Date.UTC(2040, 0, 12 - index, 9)),
        createdAt: new Date(Date.UTC(2030, 0, index + 1, 9)),
      })),
    });

    const newest = await listEvents(
      eventQuerySchema.parse({ search: fixtureTitle, sort: "newest" }),
    );
    assert.equal(newest.total, 12);
    assert.equal(newest.events.length, 10);
    assert.equal(newest.totalPages, 2);
    assert.match(newest.events[0].title, /12$/);

    const secondPage = await listEvents(
      eventQuerySchema.parse({
        search: fixtureTitle,
        sort: "newest",
        page: "2",
      }),
    );
    assert.equal(secondPage.events.length, 2);

    const oldest = await listEvents(
      eventQuerySchema.parse({ search: fixtureTitle, sort: "oldest" }),
    );
    assert.match(oldest.events[0].title, /01$/);

    const byStart = await listEvents(
      eventQuerySchema.parse({ search: fixtureTitle, sort: "start" }),
    );
    assert.match(byStart.events[0].title, /12$/);

    const byStatus = await listEvents(
      eventQuerySchema.parse({
        search: fixtureTitle,
        status: EventStatus.DRAFT,
      }),
    );
    assert.equal(byStatus.total, 12);

    const byCategory = await listEvents(
      eventQuerySchema.parse({ search: fixtureTitle, category: category.id }),
    );
    assert.equal(byCategory.total, 12);

    const online = await listEvents(
      eventQuerySchema.parse({ search: fixtureTitle, mode: "online" }),
    );
    const physical = await listEvents(
      eventQuerySchema.parse({ search: fixtureTitle, mode: "physical" }),
    );
    assert.equal(online.total, 6);
    assert.equal(physical.total, 6);
  } finally {
    await prisma.event.deleteMany({ where: { slug: { startsWith: marker } } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `.${marker}@example.test` } },
    });
    await prisma.$disconnect();
  }
});
