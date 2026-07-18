import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  ContactMessageStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import {
  canAccessContactMessageAdmin,
  canDeleteContactMessage,
  canEditContactMessageNotes,
  canUpdateContactMessage,
} from "@/lib/contact-message-policy";
import { prisma } from "@/lib/prisma";
import {
  contactMessageActionSchema,
  contactMessageIdSchema,
  contactMessageNotesSchema,
  type ContactMessageAction,
  type ContactMessageNotesInput,
  type ContactMessageQuery,
} from "@/schemas/contact-message";
import type { ContactMessageActor } from "@/types/contact-message";

const CONTACT_MESSAGE_PAGE_SIZE = 10;

type FreshActor = {
  id: string;
  role: ContactMessageActor["role"];
  status: UserStatus;
};

type StatusTarget = {
  id: string;
  status: ContactMessageStatus;
  readAt: Date | null;
  repliedAt: Date | null;
};

export class ContactMessageServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "INVALID_TRANSITION"
      | "DELETE_NOT_ALLOWED",
    message: string,
  ) {
    super(message);
    this.name = "ContactMessageServiceError";
  }
}

function assertAccess(
  actor: FreshActor | null,
): asserts actor is FreshActor {
  if (
    !actor ||
    actor.status !== UserStatus.ACTIVE ||
    !canAccessContactMessageAdmin(actor.role)
  ) {
    throw new ContactMessageServiceError(
      "FORBIDDEN",
      "You do not have permission to manage contact messages.",
    );
  }
}

async function getFreshActor(id: string): Promise<FreshActor | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true },
  });
}

async function getTransactionActor(
  transaction: Prisma.TransactionClient,
  id: string,
): Promise<FreshActor | null> {
  return transaction.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true },
  });
}

function utcStart(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function utcDayAfter(date: string): Date {
  const value = utcStart(date);
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
}

export async function listContactMessages(
  actor: ContactMessageActor,
  query: ContactMessageQuery,
) {
  const freshActor = await getFreshActor(actor.id);
  assertAccess(freshActor);

  const where: Prisma.ContactMessageWhereInput = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { subject: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: utcStart(query.from) } : {}),
            ...(query.to ? { lt: utcDayAfter(query.to) } : {}),
          },
        }
      : {}),
  };
  const orderBy: Prisma.ContactMessageOrderByWithRelationInput[] =
    query.sort === "alphabetical"
      ? [{ name: "asc" }, { createdAt: "desc" }, { id: "asc" }]
      : [
          { createdAt: query.sort === "oldest" ? "asc" : "desc" },
          { id: "asc" },
        ];
  const skip = (query.page - 1) * CONTACT_MESSAGE_PAGE_SIZE;

  const [
    filteredTotal,
    rows,
    total,
    newCount,
    read,
    replied,
    archived,
    spam,
  ] = await prisma.$transaction([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({
      where,
      orderBy,
      skip,
      take: CONTACT_MESSAGE_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        status: true,
        readAt: true,
        repliedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { status: ContactMessageStatus.NEW } }),
    prisma.contactMessage.count({ where: { status: ContactMessageStatus.READ } }),
    prisma.contactMessage.count({ where: { status: ContactMessageStatus.REPLIED } }),
    prisma.contactMessage.count({ where: { status: ContactMessageStatus.ARCHIVED } }),
    prisma.contactMessage.count({ where: { status: ContactMessageStatus.SPAM } }),
  ]);

  return {
    messages: rows.map(({ phone, ...message }) => ({
      ...message,
      hasPhone: Boolean(phone?.trim()),
    })),
    filteredTotal,
    summary: { total, new: newCount, read, replied, archived, spam },
    page: query.page,
    pageSize: CONTACT_MESSAGE_PAGE_SIZE,
    totalPages: Math.max(
      1,
      Math.ceil(filteredTotal / CONTACT_MESSAGE_PAGE_SIZE),
    ),
  };
}

export async function getContactMessage(
  actor: ContactMessageActor,
  id: string,
) {
  const parsedId = contactMessageIdSchema.parse(id);
  const freshActor = await getFreshActor(actor.id);
  assertAccess(freshActor);

  return prisma.contactMessage.findUnique({
    where: { id: parsedId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      subject: true,
      message: true,
      status: true,
      adminNotes: true,
      readAt: true,
      repliedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

function invalidTransition(message: string): never {
  throw new ContactMessageServiceError("INVALID_TRANSITION", message);
}

function statusUpdate(
  target: StatusTarget,
  action: ContactMessageAction,
  now: Date,
): {
  data: Prisma.ContactMessageUpdateInput;
  auditAction: string;
  nextStatus: ContactMessageStatus;
  changed: boolean;
} {
  switch (action) {
    case "read": {
      if (
        target.status === ContactMessageStatus.REPLIED ||
        target.status === ContactMessageStatus.ARCHIVED ||
        target.status === ContactMessageStatus.SPAM
      ) {
        invalidTransition("This message cannot be marked as read from its current status.");
      }
      return {
        data: {
          status: ContactMessageStatus.READ,
          readAt: target.readAt ?? now,
        },
        auditAction: "CONTACT_MESSAGE_READ",
        nextStatus: ContactMessageStatus.READ,
        changed:
          target.status !== ContactMessageStatus.READ || target.readAt === null,
      };
    }
    case "replied": {
      if (
        target.status === ContactMessageStatus.ARCHIVED ||
        target.status === ContactMessageStatus.SPAM
      ) {
        invalidTransition("Restore this message before marking it as replied.");
      }
      return {
        data: {
          status: ContactMessageStatus.REPLIED,
          readAt: target.readAt ?? now,
          repliedAt: target.repliedAt ?? now,
        },
        auditAction: "CONTACT_MESSAGE_REPLIED",
        nextStatus: ContactMessageStatus.REPLIED,
        changed:
          target.status !== ContactMessageStatus.REPLIED ||
          target.readAt === null ||
          target.repliedAt === null,
      };
    }
    case "archive":
      return {
        data: { status: ContactMessageStatus.ARCHIVED },
        auditAction: "CONTACT_MESSAGE_ARCHIVED",
        nextStatus: ContactMessageStatus.ARCHIVED,
        changed: target.status !== ContactMessageStatus.ARCHIVED,
      };
    case "spam":
      return {
        data: { status: ContactMessageStatus.SPAM },
        auditAction: "CONTACT_MESSAGE_MARKED_SPAM",
        nextStatus: ContactMessageStatus.SPAM,
        changed: target.status !== ContactMessageStatus.SPAM,
      };
    case "restore": {
      if (
        target.status !== ContactMessageStatus.ARCHIVED &&
        target.status !== ContactMessageStatus.SPAM
      ) {
        invalidTransition("Only archived or spam messages can be restored.");
      }
      return {
        data: {
          status: ContactMessageStatus.READ,
          readAt: target.readAt ?? now,
        },
        auditAction: "CONTACT_MESSAGE_RESTORED",
        nextStatus: ContactMessageStatus.READ,
        changed: true,
      };
    }
  }
}

async function transitionContactMessage(
  actor: ContactMessageActor,
  id: string,
  action: ContactMessageAction,
): Promise<void> {
  const parsedId = contactMessageIdSchema.parse(id);
  const parsedAction = contactMessageActionSchema.parse(action);

  await prisma.$transaction(
    async (transaction) => {
      const [transactionActor, target] = await Promise.all([
        getTransactionActor(transaction, actor.id),
        transaction.contactMessage.findUnique({
          where: { id: parsedId },
          select: {
            id: true,
            status: true,
            readAt: true,
            repliedAt: true,
          },
        }),
      ]);
      assertAccess(transactionActor);
      if (!canUpdateContactMessage(transactionActor.role)) {
        throw new ContactMessageServiceError(
          "FORBIDDEN",
          "You do not have permission to update contact messages.",
        );
      }
      if (!target) {
        throw new ContactMessageServiceError(
          "NOT_FOUND",
          "Contact message not found.",
        );
      }

      const update = statusUpdate(target, parsedAction, new Date());
      if (!update.changed) return;

      await transaction.contactMessage.update({
        where: { id: target.id },
        data: update.data,
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          userId: transactionActor.id,
          action: update.auditAction,
          entityType: "ContactMessage",
          entityId: target.id,
          metadata: {
            previousStatus: target.status,
            nextStatus: update.nextStatus,
          },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

export function markMessageRead(actor: ContactMessageActor, id: string) {
  return transitionContactMessage(actor, id, "read");
}

export function markMessageReplied(actor: ContactMessageActor, id: string) {
  return transitionContactMessage(actor, id, "replied");
}

export function archiveMessage(actor: ContactMessageActor, id: string) {
  return transitionContactMessage(actor, id, "archive");
}

export function markMessageSpam(actor: ContactMessageActor, id: string) {
  return transitionContactMessage(actor, id, "spam");
}

export function restoreMessage(actor: ContactMessageActor, id: string) {
  return transitionContactMessage(actor, id, "restore");
}

export async function updateMessageNotes(
  actor: ContactMessageActor,
  id: string,
  input: ContactMessageNotesInput,
): Promise<void> {
  const parsedId = contactMessageIdSchema.parse(id);
  const parsed = contactMessageNotesSchema.parse(input);
  const nextNotes = parsed.adminNotes || null;

  await prisma.$transaction(
    async (transaction) => {
      const [transactionActor, target] = await Promise.all([
        getTransactionActor(transaction, actor.id),
        transaction.contactMessage.findUnique({
          where: { id: parsedId },
          select: { id: true, adminNotes: true },
        }),
      ]);
      assertAccess(transactionActor);
      if (!canEditContactMessageNotes(transactionActor.role)) {
        throw new ContactMessageServiceError(
          "FORBIDDEN",
          "You do not have permission to edit admin notes.",
        );
      }
      if (!target) {
        throw new ContactMessageServiceError(
          "NOT_FOUND",
          "Contact message not found.",
        );
      }
      if (target.adminNotes === nextNotes) return;

      await transaction.contactMessage.update({
        where: { id: target.id },
        data: { adminNotes: nextNotes },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          userId: transactionActor.id,
          action: "CONTACT_MESSAGE_NOTES_UPDATED",
          entityType: "ContactMessage",
          entityId: target.id,
          metadata: { notesPresent: nextNotes !== null },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

export async function deleteMessage(
  actor: ContactMessageActor,
  id: string,
): Promise<void> {
  const parsedId = contactMessageIdSchema.parse(id);

  await prisma.$transaction(
    async (transaction) => {
      const [transactionActor, target] = await Promise.all([
        getTransactionActor(transaction, actor.id),
        transaction.contactMessage.findUnique({
          where: { id: parsedId },
          select: { id: true, status: true },
        }),
      ]);
      assertAccess(transactionActor);
      if (!target) {
        throw new ContactMessageServiceError(
          "NOT_FOUND",
          "Contact message not found.",
        );
      }
      if (!canDeleteContactMessage(transactionActor.role, target.status)) {
        throw new ContactMessageServiceError(
          transactionActor.role === UserRole.SUPER_ADMIN
            ? "DELETE_NOT_ALLOWED"
            : "FORBIDDEN",
          transactionActor.role === UserRole.SUPER_ADMIN
            ? "Archive or mark this message as spam before permanent deletion."
            : "Only a super administrator can permanently delete contact messages.",
        );
      }

      await transaction.contactMessage.delete({ where: { id: target.id } });
      await transaction.auditLog.create({
        data: {
          userId: transactionActor.id,
          action: "CONTACT_MESSAGE_DELETED",
          entityType: "ContactMessage",
          entityId: target.id,
          metadata: { previousStatus: target.status },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
