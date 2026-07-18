import "server-only";

import { randomBytes } from "node:crypto";

import { hash } from "bcryptjs";

import type { Prisma } from "@/generated/prisma/client";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import {
  canAccessUserAdmin,
  canAssignUserRole,
  canChangeUserStatus,
  canCreateUser,
  canDeleteUser,
  canEditUser,
  preservesActiveSuperAdmin,
} from "@/lib/user-policy";
import { prisma } from "@/lib/prisma";
import {
  normalizeUserProfile,
  userCreateSchema,
  userEditSchema,
  type UserCreateInput,
  type UserEditInput,
  type UserQuery,
} from "@/schemas/user";
import type { UserActor, UserEditValues } from "@/types/user";

const USER_PAGE_SIZE = 10;
const PASSWORD_HASH_ROUNDS = 12;

type FreshActor = {
  id: string;
  role: UserRole;
  status: UserStatus;
};

type TargetAccount = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  status: UserStatus;
};

export class UserServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "DUPLICATE_EMAIL"
      | "SELF_STATUS_CHANGE"
      | "SELF_DELETE"
      | "SELF_ROLE_CHANGE"
      | "LAST_ACTIVE_SUPER_ADMIN"
      | "INVALID_STATUS_TRANSITION",
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function assertFreshActor(
  actor: FreshActor | null,
): asserts actor is FreshActor {
  if (
    !actor ||
    actor.status !== UserStatus.ACTIVE ||
    !canAccessUserAdmin(actor.role)
  ) {
    throw new UserServiceError(
      "FORBIDDEN",
      "You do not have permission to manage users.",
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

function assertCanEditTarget(
  actor: FreshActor,
  target: TargetAccount,
): void {
  if (!canEditUser(actor, target)) {
    throw new UserServiceError(
      "FORBIDDEN",
      "You do not have permission to edit this user.",
    );
  }
}

function assertStatusTransition(
  current: UserStatus,
  next: UserStatus,
): void {
  if (
    current !== next &&
    (current === UserStatus.INVITED || next === UserStatus.INVITED)
  ) {
    throw new UserServiceError(
      "INVALID_STATUS_TRANSITION",
      "Invited accounts require the future password-setup flow before activation.",
      "status",
    );
  }
}

async function assertActiveSuperAdminInvariant(
  transaction: Prisma.TransactionClient,
  current: { role: UserRole; status: UserStatus },
  next: { role: UserRole; status: UserStatus } | null,
): Promise<void> {
  const activeSuperAdminCount = await transaction.user.count({
    where: {
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  if (!preservesActiveSuperAdmin(activeSuperAdminCount, current, next)) {
    throw new UserServiceError(
      "LAST_ACTIVE_SUPER_ADMIN",
      "The last active super administrator cannot be suspended, demoted, or deleted.",
    );
  }
}

function safeTargetMetadata(target: TargetAccount) {
  return {
    targetName: target.name,
    targetEmail: target.email,
    targetRole: target.role,
    targetStatus: target.status,
  };
}

export async function listUsers(actor: UserActor, query: UserQuery) {
  const freshActor = await getFreshActor(actor.id);
  assertFreshActor(freshActor);

  const where: Prisma.UserWhereInput = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    query.sort === "alphabetical"
      ? [{ name: "asc" }, { createdAt: "desc" }]
      : query.sort === "recent-login"
        ? [
            { lastLoginAt: { sort: "desc", nulls: "last" } },
            { name: "asc" },
          ]
        : [{ createdAt: query.sort === "oldest" ? "asc" : "desc" }];
  const skip = (query.page - 1) * USER_PAGE_SIZE;

  const [filteredTotal, users, total, active, suspended, invited, activeSuperAdminCount] =
    await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: USER_PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      prisma.user.count({ where: { status: UserStatus.INVITED } }),
      prisma.user.count({
        where: {
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        },
      }),
    ]);

  return {
    users,
    filteredTotal,
    summary: { total, active, suspended, invited },
    activeSuperAdminCount,
    page: query.page,
    pageSize: USER_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(filteredTotal / USER_PAGE_SIZE)),
  };
}

export async function getUserForEdit(
  actor: UserActor,
  id: string,
): Promise<UserEditValues | null> {
  const [freshActor, target] = await Promise.all([
    getFreshActor(actor.id),
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
      },
    }),
  ]);
  assertFreshActor(freshActor);

  if (!target) {
    return null;
  }
  assertCanEditTarget(freshActor, target);

  return {
    ...target,
    image: target.image ?? "",
  };
}

export async function createUser(
  actor: UserActor,
  input: UserCreateInput,
) {
  const parsed = userCreateSchema.parse(input);
  const freshActor = await getFreshActor(actor.id);
  assertFreshActor(freshActor);

  if (!canCreateUser(freshActor.role, parsed.role)) {
    throw new UserServiceError(
      "FORBIDDEN",
      "You do not have permission to create a user with this role.",
      "role",
    );
  }

  const secret =
    parsed.status === UserStatus.ACTIVE
      ? parsed.temporaryPassword
      : randomBytes(48).toString("base64url");
  const passwordHash = await hash(secret, PASSWORD_HASH_ROUNDS);
  const normalized = normalizeUserProfile(parsed);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const transactionActor = await getTransactionActor(
          transaction,
          actor.id,
        );
        assertFreshActor(transactionActor);

        if (!canCreateUser(transactionActor.role, normalized.role)) {
          throw new UserServiceError(
            "FORBIDDEN",
            "You do not have permission to create a user with this role.",
            "role",
          );
        }

        const duplicateEmail = await transaction.user.findUnique({
          where: { email: normalized.email },
          select: { id: true },
        });
        if (duplicateEmail) {
          throw new UserServiceError(
            "DUPLICATE_EMAIL",
            "A user with this email already exists.",
            "email",
          );
        }

        const created = await transaction.user.create({
          data: {
            name: normalized.name,
            email: normalized.email,
            image: normalized.image,
            role: normalized.role,
            status: normalized.status,
            passwordHash,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        });

        await transaction.auditLog.create({
          data: {
            userId: transactionActor.id,
            action: "USER_CREATED",
            entityType: "User",
            entityId: created.id,
            metadata: {
              ...safeTargetMetadata(created),
              invitationPending: created.status === UserStatus.INVITED,
            },
          },
        });

        return { id: created.id };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new UserServiceError(
        "DUPLICATE_EMAIL",
        "A user with this email already exists.",
        "email",
      );
    }
    throw error;
  }
}

export async function updateUser(
  actor: UserActor,
  id: string,
  input: UserEditInput,
) {
  const parsed = userEditSchema.parse(input);
  const normalized = normalizeUserProfile(parsed);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const [transactionActor, target] = await Promise.all([
          getTransactionActor(transaction, actor.id),
          transaction.user.findUnique({
            where: { id },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              status: true,
            },
          }),
        ]);
        assertFreshActor(transactionActor);

        if (!target) {
          throw new UserServiceError("NOT_FOUND", "User not found.");
        }
        assertCanEditTarget(transactionActor, target);

        if (transactionActor.id === target.id && normalized.role !== target.role) {
          throw new UserServiceError(
            "SELF_ROLE_CHANGE",
            "You cannot change your own role.",
            "role",
          );
        }
        if (
          transactionActor.id === target.id &&
          normalized.status !== target.status
        ) {
          throw new UserServiceError(
            "SELF_STATUS_CHANGE",
            "You cannot suspend or change the status of your own account.",
            "status",
          );
        }
        if (
          !canAssignUserRole(transactionActor, target, normalized.role)
        ) {
          throw new UserServiceError(
            "FORBIDDEN",
            "You do not have permission to assign this role.",
            "role",
          );
        }

        assertStatusTransition(target.status, normalized.status);
        const duplicateEmail = await transaction.user.findFirst({
          where: {
            email: normalized.email,
            id: { not: target.id },
          },
          select: { id: true },
        });
        if (duplicateEmail) {
          throw new UserServiceError(
            "DUPLICATE_EMAIL",
            "A user with this email already exists.",
            "email",
          );
        }
        await assertActiveSuperAdminInvariant(transaction, target, {
          role: normalized.role,
          status: normalized.status,
        });

        const changedFields = [
          ...(target.name !== normalized.name ? ["name"] : []),
          ...(target.email !== normalized.email ? ["email"] : []),
          ...(target.image !== normalized.image ? ["image"] : []),
          ...(target.role !== normalized.role ? ["role"] : []),
          ...(target.status !== normalized.status ? ["status"] : []),
        ];
        const updated = await transaction.user.update({
          where: { id: target.id },
          data: {
            name: normalized.name,
            email: normalized.email,
            image: normalized.image,
            role: normalized.role,
            status: normalized.status,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        });

        await transaction.auditLog.create({
          data: {
            userId: transactionActor.id,
            action: "USER_UPDATED",
            entityType: "User",
            entityId: updated.id,
            metadata: {
              ...safeTargetMetadata(updated),
              changedFields,
            },
          },
        });

        if (target.role !== updated.role) {
          await transaction.auditLog.create({
            data: {
              userId: transactionActor.id,
              action: "USER_ROLE_CHANGED",
              entityType: "User",
              entityId: updated.id,
              metadata: {
                targetEmail: updated.email,
                previousRole: target.role,
                nextRole: updated.role,
              },
            },
          });
        }
        if (target.status !== updated.status) {
          await transaction.auditLog.create({
            data: {
              userId: transactionActor.id,
              action:
                updated.status === UserStatus.SUSPENDED
                  ? "USER_SUSPENDED"
                  : "USER_REACTIVATED",
              entityType: "User",
              entityId: updated.id,
              metadata: {
                targetEmail: updated.email,
                previousStatus: target.status,
                nextStatus: updated.status,
              },
            },
          });
        }

        return { id: updated.id };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new UserServiceError(
        "DUPLICATE_EMAIL",
        "A user with this email already exists.",
        "email",
      );
    }
    throw error;
  }
}

export async function setUserStatus(
  actor: UserActor,
  id: string,
  status: typeof UserStatus.ACTIVE | typeof UserStatus.SUSPENDED,
): Promise<void> {
  if (status !== UserStatus.ACTIVE && status !== UserStatus.SUSPENDED) {
    throw new UserServiceError(
      "INVALID_STATUS_TRANSITION",
      "Select a valid user status.",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      const [transactionActor, target] = await Promise.all([
        getTransactionActor(transaction, actor.id),
        transaction.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        }),
      ]);
      assertFreshActor(transactionActor);

      if (!target) {
        throw new UserServiceError("NOT_FOUND", "User not found.");
      }
      if (transactionActor.id === target.id) {
        throw new UserServiceError(
          "SELF_STATUS_CHANGE",
          "You cannot suspend or change the status of your own account.",
        );
      }
      if (!canChangeUserStatus(transactionActor, target)) {
        throw new UserServiceError(
          "FORBIDDEN",
          "You do not have permission to change this user's status.",
        );
      }
      assertStatusTransition(target.status, status);

      if (target.status === status) {
        return;
      }

      await assertActiveSuperAdminInvariant(transaction, target, {
        role: target.role,
        status,
      });
      await transaction.user.update({
        where: { id: target.id },
        data: { status },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          userId: transactionActor.id,
          action:
            status === UserStatus.SUSPENDED
              ? "USER_SUSPENDED"
              : "USER_REACTIVATED",
          entityType: "User",
          entityId: target.id,
          metadata: {
            targetName: target.name,
            targetEmail: target.email,
            targetRole: target.role,
            previousStatus: target.status,
            nextStatus: status,
          },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

export async function deleteUser(
  actor: UserActor,
  id: string,
): Promise<void> {
  await prisma.$transaction(
    async (transaction) => {
      const [transactionActor, target] = await Promise.all([
        getTransactionActor(transaction, actor.id),
        transaction.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        }),
      ]);
      assertFreshActor(transactionActor);

      if (!target) {
        throw new UserServiceError("NOT_FOUND", "User not found.");
      }
      if (transactionActor.id === target.id) {
        throw new UserServiceError(
          "SELF_DELETE",
          "You cannot permanently delete your own account.",
        );
      }
      if (!canDeleteUser(transactionActor, target)) {
        throw new UserServiceError(
          "FORBIDDEN",
          "You do not have permission to permanently delete this user.",
        );
      }

      await assertActiveSuperAdminInvariant(transaction, target, null);
      await transaction.user.delete({ where: { id: target.id } });
      await transaction.auditLog.create({
        data: {
          userId: transactionActor.id,
          action: "USER_DELETED",
          entityType: "User",
          entityId: target.id,
          metadata: safeTargetMetadata(target),
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
