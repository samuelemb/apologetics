import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { compare, hash } from "bcryptjs";

import {
  ContentStatus,
  EventStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { isLoginEligible } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import {
  userCreateSchema,
  userEditSchema,
  userQuerySchema,
} from "@/schemas/user";
import {
  createUser,
  deleteUser,
  getUserForEdit,
  listUsers,
  setUserStatus,
  updateUser,
  UserServiceError,
} from "@/services/user.service";

function expectUserError(code: UserServiceError["code"]) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof UserServiceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("user service enforces PostgreSQL administration workflows and cleans fixtures", async () => {
  const marker = `phase-8-user-${randomUUID()}`;
  const temporaryPassword = "TemporaryUser123";
  const trackedUserIds = new Set<string>();

  try {
    const seededSuperAdmin = await prisma.user.findFirst({
      where: {
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, role: true },
    });
    assert.ok(seededSuperAdmin, "An active seeded super admin is required.");
    const superAdminActor = {
      id: seededSuperAdmin.id,
      role: seededSuperAdmin.role,
    };

    const editor = await createUser(
      superAdminActor,
      userCreateSchema.parse({
        name: `${marker} Editor`,
        email: `editor-${marker}@example.test`,
        image: "",
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        temporaryPassword,
      }),
    );
    trackedUserIds.add(editor.id);
    const storedEditor = await prisma.user.findUniqueOrThrow({
      where: { id: editor.id },
    });
    assert.notEqual(storedEditor.passwordHash, temporaryPassword);
    assert.equal(await compare(temporaryPassword, storedEditor.passwordHash), true);

    const invited = await createUser(
      superAdminActor,
      userCreateSchema.parse({
        name: `${marker} Invited Author`,
        email: `invited-${marker}@example.test`,
        image: "",
        role: UserRole.AUTHOR,
        status: UserStatus.INVITED,
        temporaryPassword: "",
      }),
    );
    trackedUserIds.add(invited.id);
    const storedInvited = await prisma.user.findUniqueOrThrow({
      where: { id: invited.id },
      select: { passwordHash: true, status: true },
    });
    assert.equal(storedInvited.status, UserStatus.INVITED);
    assert.ok(storedInvited.passwordHash.length > 20);
    assert.equal(await compare(temporaryPassword, storedInvited.passwordHash), false);

    await assert.rejects(
      () =>
        createUser(
          superAdminActor,
          userCreateSchema.parse({
            name: `${marker} Duplicate`,
            email: `EDITOR-${marker}@EXAMPLE.TEST`,
            image: "",
            role: UserRole.EDITOR,
            status: UserStatus.ACTIVE,
            temporaryPassword,
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof UserServiceError);
        assert.equal(error.code, "DUPLICATE_EMAIL");
        assert.equal(error.field, "email");
        assert.equal(error.message, "A user with this email already exists.");
        return true;
      },
    );

    const admin = await createUser(
      superAdminActor,
      userCreateSchema.parse({
        name: `${marker} Admin`,
        email: `admin-${marker}@example.test`,
        image: "",
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        temporaryPassword,
      }),
    );
    trackedUserIds.add(admin.id);
    const adminActor = { id: admin.id, role: UserRole.ADMIN };

    const adminCreatedAuthor = await createUser(
      adminActor,
      userCreateSchema.parse({
        name: `${marker} Admin Created Author`,
        email: `admin-author-${marker}@example.test`,
        image: "",
        role: UserRole.AUTHOR,
        status: UserStatus.ACTIVE,
        temporaryPassword,
      }),
    );
    trackedUserIds.add(adminCreatedAuthor.id);
    const adminCreatedEditor = await createUser(
      adminActor,
      userCreateSchema.parse({
        name: `${marker} Admin Created Editor`,
        email: `admin-editor-${marker}@example.test`,
        image: "",
        role: UserRole.EDITOR,
        status: UserStatus.INVITED,
        temporaryPassword: "",
      }),
    );
    trackedUserIds.add(adminCreatedEditor.id);

    for (const forbiddenRole of [UserRole.ADMIN, UserRole.SUPER_ADMIN]) {
      await assert.rejects(
        () =>
          createUser(
            adminActor,
            userCreateSchema.parse({
              name: `${marker} Forbidden ${forbiddenRole}`,
              email: `forbidden-${forbiddenRole.toLowerCase()}-${marker}@example.test`,
              image: "",
              role: forbiddenRole,
              status: UserStatus.INVITED,
              temporaryPassword: "",
            }),
          ),
        expectUserError("FORBIDDEN"),
      );
    }

    const secondAdmin = await createUser(
      superAdminActor,
      userCreateSchema.parse({
        name: `${marker} Second Admin`,
        email: `second-admin-${marker}@example.test`,
        image: "",
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        temporaryPassword,
      }),
    );
    trackedUserIds.add(secondAdmin.id);
    const seededSuperAdminSafe = await prisma.user.findUniqueOrThrow({
      where: { id: seededSuperAdmin.id },
      select: { id: true, name: true, email: true, image: true, role: true, status: true },
    });
    const secondAdminSafe = await prisma.user.findUniqueOrThrow({
      where: { id: secondAdmin.id },
      select: { id: true, name: true, email: true, image: true, role: true, status: true },
    });
    for (const target of [seededSuperAdminSafe, secondAdminSafe]) {
      await assert.rejects(
        () =>
          updateUser(
            adminActor,
            target.id,
            userEditSchema.parse({
              name: target.name,
              email: target.email,
              image: target.image ?? "",
              role: target.role,
              status: target.status,
            }),
          ),
        expectUserError("FORBIDDEN"),
      );
    }

    const spoofedEditorActor = {
      id: editor.id,
      role: UserRole.SUPER_ADMIN,
    };
    await assert.rejects(
      () => listUsers(spoofedEditorActor, userQuerySchema.parse({})),
      expectUserError("FORBIDDEN"),
    );
    await assert.rejects(
      () =>
        createUser(
          spoofedEditorActor,
          userCreateSchema.parse({
            name: `${marker} Unauthorized`,
            email: `unauthorized-${marker}@example.test`,
            image: "",
            role: UserRole.AUTHOR,
            status: UserStatus.INVITED,
            temporaryPassword: "",
          }),
        ),
      expectUserError("FORBIDDEN"),
    );

    const fixedLastLogin = new Date("2035-05-05T10:00:00.000Z");
    await prisma.user.update({
      where: { id: editor.id },
      data: { lastLoginAt: fixedLastLogin },
    });
    const beforeEdit = await prisma.user.findUniqueOrThrow({
      where: { id: editor.id },
      select: { passwordHash: true, lastLoginAt: true, createdAt: true },
    });
    await updateUser(
      superAdminActor,
      editor.id,
      userEditSchema.parse({
        name: `${marker} Updated Editor`,
        email: `updated-editor-${marker}@example.test`,
        image: "https://example.test/updated-avatar.png",
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      }),
    );
    const afterEdit = await prisma.user.findUniqueOrThrow({
      where: { id: editor.id },
      select: {
        passwordHash: true,
        lastLoginAt: true,
        createdAt: true,
        name: true,
      },
    });
    assert.equal(afterEdit.name, `${marker} Updated Editor`);
    assert.equal(afterEdit.passwordHash, beforeEdit.passwordHash);
    assert.deepEqual(afterEdit.lastLoginAt, beforeEdit.lastLoginAt);
    assert.deepEqual(afterEdit.createdAt, beforeEdit.createdAt);

    const safeEditRecord = await getUserForEdit(superAdminActor, editor.id);
    assert.ok(safeEditRecord);
    assert.equal("passwordHash" in safeEditRecord, false);

    await assert.rejects(
      () =>
        updateUser(
          adminActor,
          admin.id,
          userEditSchema.parse({
            name: `${marker} Admin`,
            email: `admin-${marker}@example.test`,
            image: "",
            role: UserRole.AUTHOR,
            status: UserStatus.ACTIVE,
          }),
        ),
      expectUserError("SELF_ROLE_CHANGE"),
    );
    await assert.rejects(
      () => setUserStatus(adminActor, admin.id, UserStatus.SUSPENDED),
      expectUserError("SELF_STATUS_CHANGE"),
    );
    await assert.rejects(
      () => deleteUser(adminActor, admin.id),
      expectUserError("SELF_DELETE"),
    );

    await setUserStatus(adminActor, editor.id, UserStatus.SUSPENDED);
    let editorStatus = await prisma.user.findUniqueOrThrow({
      where: { id: editor.id },
      select: { status: true, role: true },
    });
    assert.equal(
      isLoginEligible(editorStatus.status, editorStatus.role),
      false,
    );
    await assert.rejects(
      () =>
        listUsers(
          { id: editor.id, role: UserRole.SUPER_ADMIN },
          userQuerySchema.parse({}),
        ),
      expectUserError("FORBIDDEN"),
    );
    await setUserStatus(adminActor, editor.id, UserStatus.ACTIVE);
    editorStatus = await prisma.user.findUniqueOrThrow({
      where: { id: editor.id },
      select: { status: true, role: true },
    });
    assert.equal(
      isLoginEligible(editorStatus.status, editorStatus.role),
      true,
    );

    await updateUser(
      superAdminActor,
      editor.id,
      userEditSchema.parse({
        name: `${marker} Updated Editor`,
        email: `updated-editor-${marker}@example.test`,
        image: "https://example.test/updated-avatar.png",
        role: UserRole.AUTHOR,
        status: UserStatus.ACTIVE,
      }),
    );
    await updateUser(
      superAdminActor,
      editor.id,
      userEditSchema.parse({
        name: `${marker} Updated Editor`,
        email: `updated-editor-${marker}@example.test`,
        image: "https://example.test/updated-avatar.png",
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      }),
    );

    const secondSuperAdmin = await createUser(
      superAdminActor,
      userCreateSchema.parse({
        name: `${marker} Second Super Admin`,
        email: `second-super-${marker}@example.test`,
        image: "",
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        temporaryPassword,
      }),
    );
    trackedUserIds.add(secondSuperAdmin.id);
    await setUserStatus(
      superAdminActor,
      secondSuperAdmin.id,
      UserStatus.SUSPENDED,
    );
    await setUserStatus(
      superAdminActor,
      secondSuperAdmin.id,
      UserStatus.ACTIVE,
    );

    const fixtureHash = await hash("DatabaseFixture123", 4);
    const pagingUsers = Array.from({ length: 12 }, (_, index) => ({
      name: `${marker} Paging ${String(index).padStart(2, "0")}`,
      email: `paging-${String(index).padStart(2, "0")}-${marker}@example.test`,
      passwordHash: fixtureHash,
      role: UserRole.AUTHOR,
      status: UserStatus.ACTIVE,
      createdAt: new Date(Date.UTC(2030, 0, index + 1)),
    }));
    await prisma.user.createMany({ data: pagingUsers });
    const storedPagingUsers = await prisma.user.findMany({
      where: { email: { contains: `paging-`, mode: "insensitive" }, name: { contains: marker } },
      select: { id: true, email: true },
    });
    storedPagingUsers.forEach((user) => trackedUserIds.add(user.id));
    await prisma.user.update({
      where: { email: `paging-05-${marker}@example.test` },
      data: { lastLoginAt: new Date("2040-01-01T00:00:00.000Z") },
    });

    const firstPage = await listUsers(
      superAdminActor,
      userQuerySchema.parse({
        search: `paging-`,
        role: UserRole.AUTHOR,
        status: UserStatus.ACTIVE,
        sort: "alphabetical",
        page: 1,
      }),
    );
    const secondPage = await listUsers(
      superAdminActor,
      userQuerySchema.parse({
        search: `paging-`,
        role: UserRole.AUTHOR,
        status: UserStatus.ACTIVE,
        sort: "alphabetical",
        page: 2,
      }),
    );
    assert.equal(firstPage.filteredTotal, 12);
    assert.equal(firstPage.users.length, 10);
    assert.equal(secondPage.users.length, 2);
    assert.equal(firstPage.users.every((user) => !("passwordHash" in user)), true);

    const oldest = await listUsers(
      superAdminActor,
      userQuerySchema.parse({ search: `paging-`, sort: "oldest" }),
    );
    const newest = await listUsers(
      superAdminActor,
      userQuerySchema.parse({ search: `paging-`, sort: "newest" }),
    );
    const recentLogin = await listUsers(
      superAdminActor,
      userQuerySchema.parse({ search: `paging-`, sort: "recent-login" }),
    );
    assert.equal(oldest.users[0].email, `paging-00-${marker}@example.test`);
    assert.equal(newest.users[0].email, `paging-11-${marker}@example.test`);
    assert.equal(recentLogin.users[0].email, `paging-05-${marker}@example.test`);
    assert.deepEqual(firstPage.summary, {
      total: await prisma.user.count(),
      active: await prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      suspended: await prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      invited: await prisma.user.count({ where: { status: UserStatus.INVITED } }),
    });

    await assert.rejects(
      () =>
        updateUser(
          superAdminActor,
          editor.id,
          userEditSchema.parse({
            name: `${marker} Duplicate Update`,
            email: `admin-${marker}@example.test`,
            image: "",
            role: UserRole.EDITOR,
            status: UserStatus.ACTIVE,
          }),
        ),
      expectUserError("DUPLICATE_EMAIL"),
    );

    const deletable = await createUser(
      adminActor,
      userCreateSchema.parse({
        name: `${marker} Deletable Author`,
        email: `deletable-${marker}@example.test`,
        image: "",
        role: UserRole.AUTHOR,
        status: UserStatus.ACTIVE,
        temporaryPassword,
      }),
    );
    trackedUserIds.add(deletable.id);
    const [article, event, issue] = await prisma.$transaction([
      prisma.newsArticle.create({
        data: {
          title: `${marker} retained news`,
          slug: `${marker}-retained-news`,
          content: "Temporary user deletion fixture",
          status: ContentStatus.DRAFT,
          authorId: deletable.id,
        },
        select: { id: true },
      }),
      prisma.event.create({
        data: {
          title: `${marker} retained event`,
          slug: `${marker}-retained-event`,
          content: "Temporary user deletion fixture",
          startAt: new Date("2035-01-01T09:00:00.000Z"),
          status: EventStatus.DRAFT,
          authorId: deletable.id,
        },
        select: { id: true },
      }),
      prisma.magazineIssue.create({
        data: {
          title: `${marker} retained magazine`,
          slug: `${marker}-retained-magazine`,
          issueNumber: `${marker}-retained-issue`,
          pdfUrl: "https://example.test/retained.pdf",
          status: ContentStatus.DRAFT,
          authorId: deletable.id,
        },
        select: { id: true },
      }),
    ]);
    await deleteUser(adminActor, deletable.id);
    assert.equal(await prisma.user.count({ where: { id: deletable.id } }), 0);
    assert.equal(
      (await prisma.newsArticle.findUniqueOrThrow({ where: { id: article.id } }))
        .authorId,
      null,
    );
    assert.equal(
      (await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).authorId,
      null,
    );
    assert.equal(
      (await prisma.magazineIssue.findUniqueOrThrow({ where: { id: issue.id } }))
        .authorId,
      null,
    );

    const auditActions = await prisma.auditLog.findMany({
      where: {
        entityType: "User",
        entityId: { in: [...trackedUserIds] },
      },
      select: { action: true, metadata: true },
    });
    const actionSet = new Set(auditActions.map((entry) => entry.action));
    for (const action of [
      "USER_CREATED",
      "USER_UPDATED",
      "USER_SUSPENDED",
      "USER_REACTIVATED",
      "USER_ROLE_CHANGED",
      "USER_DELETED",
    ]) {
      assert.equal(actionSet.has(action), true, `${action} audit entry is required.`);
    }
    assert.equal(
      auditActions.some((entry) =>
        JSON.stringify(entry.metadata).includes(temporaryPassword),
      ),
      false,
    );
  } finally {
    const remainingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: marker, mode: "insensitive" } },
          { name: { contains: marker, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    remainingUsers.forEach((user) => trackedUserIds.add(user.id));

    await prisma.newsArticle.deleteMany({
      where: { slug: { startsWith: marker } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: marker } },
    });
    await prisma.magazineIssue.deleteMany({
      where: { slug: { startsWith: marker } },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityType: "User",
        entityId: { in: [...trackedUserIds] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: marker, mode: "insensitive" } },
          { name: { contains: marker, mode: "insensitive" } },
        ],
      },
    });
    await prisma.$disconnect();
  }
});
