"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { UserStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import { userCreateSchema, userEditSchema } from "@/schemas/user";
import {
  createUser,
  deleteUser,
  setUserStatus,
  updateUser,
  UserServiceError,
} from "@/services/user.service";
import type {
  UserActionResult,
  UserMutationResult,
} from "@/types/user";

const userIdSchema = z.string().trim().min(1).max(64);
const manageableStatusSchema = z.enum([
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
]);

function revalidateUserRoutes(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/new");
  if (id) revalidatePath(`/admin/users/${id}/edit`);
}

function mapServiceError(error: unknown): UserMutationResult {
  if (error instanceof UserServiceError) {
    return {
      ok: false,
      message: error.message,
      ...(error.field
        ? { fieldErrors: { [error.field]: [error.message] } }
        : {}),
    };
  }

  return {
    ok: false,
    message: "The user could not be saved. Please try again.",
  };
}

export async function createUserAction(
  input: unknown,
): Promise<UserMutationResult> {
  const actor = await requireAdmin();
  const parsed = userCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const created = await createUser(
      { id: actor.id, role: actor.role },
      parsed.data,
    );
    revalidateUserRoutes(created.id);
    return { ok: true, id: created.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function updateUserAction(
  id: string,
  input: unknown,
): Promise<UserMutationResult> {
  const actor = await requireAdmin();
  const parsedId = userIdSchema.safeParse(id);
  const parsed = userEditSchema.safeParse(input);

  if (!parsedId.success) {
    return { ok: false, message: "User not found." };
  }
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await updateUser(
      { id: actor.id, role: actor.role },
      parsedId.data,
      parsed.data,
    );
    revalidateUserRoutes(updated.id);
    return { ok: true, id: updated.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function setUserStatusAction(
  id: string,
  status: unknown,
): Promise<UserActionResult> {
  const actor = await requireAdmin();
  const parsedId = userIdSchema.safeParse(id);
  const parsedStatus = manageableStatusSchema.safeParse(status);

  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, message: "User not found." };
  }

  try {
    await setUserStatus(
      { id: actor.id, role: actor.role },
      parsedId.data,
      parsedStatus.data,
    );
    revalidateUserRoutes(parsedId.data);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof UserServiceError
          ? error.message
          : "The user status could not be changed.",
    };
  }
}

export async function deleteUserAction(
  id: string,
): Promise<UserActionResult> {
  const actor = await requireAdmin();
  const parsedId = userIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: "User not found." };
  }

  try {
    await deleteUser(
      { id: actor.id, role: actor.role },
      parsedId.data,
    );
    revalidateUserRoutes();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof UserServiceError
          ? error.message
          : "The user could not be permanently deleted.",
    };
  }
}
