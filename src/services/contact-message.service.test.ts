import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { hash } from "bcryptjs";

import {
  ContactMessageStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { contactMessageQuerySchema } from "@/schemas/contact-message";
import {
  archiveMessage,
  ContactMessageServiceError,
  deleteMessage,
  getContactMessage,
  listContactMessages,
  markMessageRead,
  markMessageReplied,
  markMessageSpam,
  restoreMessage,
  updateMessageNotes,
} from "@/services/contact-message.service";

function expectServiceError(code: ContactMessageServiceError["code"]) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof ContactMessageServiceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("contact message service enforces private PostgreSQL workflows and cleans fixtures", async () => {
  const marker = `phase-9-message-${randomUUID()}`;
  const trackedMessageIds = new Set<string>();
  const trackedUserIds = new Set<string>();

  try {
    const seededSuperAdmin = await prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE },
      select: { id: true, role: true },
    });
    assert.ok(seededSuperAdmin, "An active seeded super admin is required.");
    const superAdminActor = { id: seededSuperAdmin.id, role: seededSuperAdmin.role };

    const fixtureHash = await hash("PhaseNineFixture123", 4);
    await prisma.user.createMany({
      data: [
        { name: `${marker} Admin`, email: `admin-${marker}@example.test`, passwordHash: fixtureHash, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        { name: `${marker} Editor`, email: `editor-${marker}@example.test`, passwordHash: fixtureHash, role: UserRole.EDITOR, status: UserStatus.ACTIVE },
        { name: `${marker} Author`, email: `author-${marker}@example.test`, passwordHash: fixtureHash, role: UserRole.AUTHOR, status: UserStatus.ACTIVE },
      ],
    });
    const actors = await prisma.user.findMany({
      where: { email: { contains: marker } },
      select: { id: true, role: true },
    });
    actors.forEach((actor) => trackedUserIds.add(actor.id));
    const adminActor = actors.find((actor) => actor.role === UserRole.ADMIN);
    const editorActor = actors.find((actor) => actor.role === UserRole.EDITOR);
    const authorActor = actors.find((actor) => actor.role === UserRole.AUTHOR);
    assert.ok(adminActor && editorActor && authorActor);

    const pagingSubject = `Paging ${marker}`;
    await prisma.contactMessage.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        name: `Sender ${String(11 - index).padStart(2, "0")} ${marker}`,
        email: `paging-${index}-${marker}@example.test`,
        phone: index % 2 ? null : `+251900${String(index).padStart(4, "0")}`,
        subject: `${pagingSubject} ${String(index).padStart(2, "0")}`,
        message: `Private paging body ${index} ${marker}`,
        status: ContactMessageStatus.NEW,
        createdAt: new Date(Date.UTC(2042, 0, index + 1, 12)),
      })),
    });
    const pagingRows = await prisma.contactMessage.findMany({
      where: { subject: { startsWith: pagingSubject } },
      select: { id: true },
    });
    pagingRows.forEach((message) => trackedMessageIds.add(message.id));

    const pageOne = await listContactMessages(
      superAdminActor,
      contactMessageQuerySchema.parse({ search: pagingSubject, status: ContactMessageStatus.NEW, sort: "alphabetical", page: 1 }),
    );
    const pageTwo = await listContactMessages(
      superAdminActor,
      contactMessageQuerySchema.parse({ search: pagingSubject, status: ContactMessageStatus.NEW, sort: "alphabetical", page: 2 }),
    );
    assert.equal(pageOne.filteredTotal, 12);
    assert.equal(pageOne.messages.length, 10);
    assert.equal(pageTwo.messages.length, 2);
    assert.equal(new Set([...pageOne.messages, ...pageTwo.messages].map((message) => message.id)).size, 12);
    assert.match(pageOne.messages[0].name, /^Sender 00/);
    assert.equal(pageOne.messages.every((message) => !("message" in message)), true);
    assert.equal(pageOne.messages.every((message) => !("adminNotes" in message)), true);
    assert.equal(pageOne.messages.every((message) => !("phone" in message)), true);
    assert.equal(pageOne.messages.every((message) => typeof message.hasPhone === "boolean"), true);

    const oldest = await listContactMessages(superAdminActor, contactMessageQuerySchema.parse({ search: pagingSubject, sort: "oldest" }));
    const newest = await listContactMessages(superAdminActor, contactMessageQuerySchema.parse({ search: pagingSubject, sort: "newest" }));
    assert.match(oldest.messages[0].subject ?? "", / 00$/);
    assert.match(newest.messages[0].subject ?? "", / 11$/);
    const dateRange = await listContactMessages(
      superAdminActor,
      contactMessageQuerySchema.parse({ search: pagingSubject, from: "2042-01-03", to: "2042-01-05" }),
    );
    assert.equal(dateRange.filteredTotal, 3);
    assert.deepEqual(pageOne.summary, {
      total: await prisma.contactMessage.count(),
      new: await prisma.contactMessage.count({ where: { status: ContactMessageStatus.NEW } }),
      read: await prisma.contactMessage.count({ where: { status: ContactMessageStatus.READ } }),
      replied: await prisma.contactMessage.count({ where: { status: ContactMessageStatus.REPLIED } }),
      archived: await prisma.contactMessage.count({ where: { status: ContactMessageStatus.ARCHIVED } }),
      spam: await prisma.contactMessage.count({ where: { status: ContactMessageStatus.SPAM } }),
    });

    await assert.rejects(
      () => listContactMessages({ id: editorActor.id, role: UserRole.SUPER_ADMIN }, contactMessageQuerySchema.parse({})),
      expectServiceError("FORBIDDEN"),
    );
    await assert.rejects(
      () => getContactMessage(authorActor, pagingRows[0].id),
      expectServiceError("FORBIDDEN"),
    );

    const fixedReadAt = new Date("2041-01-01T10:00:00.000Z");
    const fixedRepliedAt = new Date("2041-01-02T10:00:00.000Z");
    const sensitiveMessage = `Sensitive message ${marker}`;
    const sensitiveNotes = `Private notes ${marker}\nSecond line`;
    const sensitiveEmail = `private-${marker}@example.test`;
    const sensitivePhone = "+251911000999";
    const workflowData = [
      ["read", ContactMessageStatus.NEW, null, null],
      ["replied", ContactMessageStatus.NEW, null, null],
      ["archive", ContactMessageStatus.READ, fixedReadAt, fixedRepliedAt],
      ["spam", ContactMessageStatus.READ, fixedReadAt, fixedRepliedAt],
      ["restore", ContactMessageStatus.ARCHIVED, fixedReadAt, fixedRepliedAt],
      ["notes", ContactMessageStatus.NEW, null, null],
      ["delete", ContactMessageStatus.ARCHIVED, fixedReadAt, null],
      ["retained", ContactMessageStatus.SPAM, null, null],
      ["ineligible", ContactMessageStatus.NEW, null, null],
    ] as const;
    await prisma.contactMessage.createMany({
      data: workflowData.map(([label, status, readAt, repliedAt]) => ({
        name: `Private Sender ${marker}`,
        email: sensitiveEmail,
        phone: sensitivePhone,
        subject: `${label}-${marker}`,
        message: sensitiveMessage,
        status,
        readAt,
        repliedAt,
      })),
    });
    const workflows = await prisma.contactMessage.findMany({
      where: { subject: { endsWith: marker } },
      select: { id: true, subject: true },
    });
    workflows.forEach((message) => trackedMessageIds.add(message.id));
    const workflowId = (label: string) => {
      const item = workflows.find((message) => message.subject === `${label}-${marker}`);
      assert.ok(item);
      return item.id;
    };

    await markMessageRead(adminActor, workflowId("read"));
    const readMessage = await prisma.contactMessage.findUniqueOrThrow({ where: { id: workflowId("read") } });
    assert.equal(readMessage.status, ContactMessageStatus.READ);
    assert.ok(readMessage.readAt);

    await markMessageReplied(adminActor, workflowId("replied"));
    const repliedMessage = await prisma.contactMessage.findUniqueOrThrow({ where: { id: workflowId("replied") } });
    assert.equal(repliedMessage.status, ContactMessageStatus.REPLIED);
    assert.ok(repliedMessage.readAt && repliedMessage.repliedAt);

    await archiveMessage(adminActor, workflowId("archive"));
    const archivedMessage = await prisma.contactMessage.findUniqueOrThrow({ where: { id: workflowId("archive") } });
    assert.equal(archivedMessage.status, ContactMessageStatus.ARCHIVED);
    assert.deepEqual(archivedMessage.readAt, fixedReadAt);
    assert.deepEqual(archivedMessage.repliedAt, fixedRepliedAt);

    await markMessageSpam(adminActor, workflowId("spam"));
    const spamMessage = await prisma.contactMessage.findUniqueOrThrow({ where: { id: workflowId("spam") } });
    assert.equal(spamMessage.status, ContactMessageStatus.SPAM);
    assert.equal(spamMessage.message, sensitiveMessage);
    assert.deepEqual(spamMessage.readAt, fixedReadAt);
    assert.deepEqual(spamMessage.repliedAt, fixedRepliedAt);

    await restoreMessage(adminActor, workflowId("restore"));
    const restoredMessage = await prisma.contactMessage.findUniqueOrThrow({ where: { id: workflowId("restore") } });
    assert.equal(restoredMessage.status, ContactMessageStatus.READ);
    assert.deepEqual(restoredMessage.readAt, fixedReadAt);
    assert.deepEqual(restoredMessage.repliedAt, fixedRepliedAt);

    await updateMessageNotes(adminActor, workflowId("notes"), { adminNotes: `  ${sensitiveNotes}  ` });
    const notesMessage = await prisma.contactMessage.findUniqueOrThrow({ where: { id: workflowId("notes") }, select: { adminNotes: true } });
    assert.equal(notesMessage.adminNotes, sensitiveNotes);

    await assert.rejects(() => markMessageRead(editorActor, workflowId("notes")), expectServiceError("FORBIDDEN"));
    await assert.rejects(() => deleteMessage(adminActor, workflowId("delete")), expectServiceError("FORBIDDEN"));
    await assert.rejects(() => deleteMessage(superAdminActor, workflowId("ineligible")), expectServiceError("DELETE_NOT_ALLOWED"));
    await deleteMessage(superAdminActor, workflowId("delete"));
    assert.equal(await prisma.contactMessage.count({ where: { id: workflowId("delete") } }), 0);
    assert.equal(await prisma.contactMessage.count({ where: { id: workflowId("retained") } }), 1);

    const audits = await prisma.auditLog.findMany({
      where: { entityType: "ContactMessage", entityId: { in: [...trackedMessageIds] } },
      select: { action: true, entityId: true, userId: true, metadata: true },
    });
    const actions = new Set(audits.map((audit) => audit.action));
    for (const action of [
      "CONTACT_MESSAGE_READ",
      "CONTACT_MESSAGE_REPLIED",
      "CONTACT_MESSAGE_ARCHIVED",
      "CONTACT_MESSAGE_MARKED_SPAM",
      "CONTACT_MESSAGE_RESTORED",
      "CONTACT_MESSAGE_NOTES_UPDATED",
      "CONTACT_MESSAGE_DELETED",
    ]) {
      assert.equal(actions.has(action), true, `${action} audit entry is required.`);
    }
    assert.equal(audits.every((audit) => Boolean(audit.userId && audit.entityId)), true);
    const serializedMetadata = JSON.stringify(audits.map((audit) => audit.metadata));
    for (const privateValue of [sensitiveMessage, sensitiveNotes, sensitiveEmail, sensitivePhone, `Private Sender ${marker}`]) {
      assert.equal(serializedMetadata.includes(privateValue), false);
    }
  } finally {
    const remainingMessages = await prisma.contactMessage.findMany({
      where: {
        OR: [
          { name: { contains: marker } },
          { email: { contains: marker } },
          { subject: { contains: marker } },
          { message: { contains: marker } },
        ],
      },
      select: { id: true },
    });
    remainingMessages.forEach((message) => trackedMessageIds.add(message.id));
    if (trackedMessageIds.size) {
      await prisma.auditLog.deleteMany({ where: { entityType: "ContactMessage", entityId: { in: [...trackedMessageIds] } } });
      await prisma.contactMessage.deleteMany({ where: { id: { in: [...trackedMessageIds] } } });
    }
    await prisma.auditLog.deleteMany({ where: { userId: { in: [...trackedUserIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...trackedUserIds] } } });
  }
});
