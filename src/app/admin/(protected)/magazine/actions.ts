"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { magazineFormSchema } from "@/schemas/magazine";
import {
  createMagazineIssue,
  deleteMagazineIssue,
  MagazineServiceError,
  updateMagazineIssue,
} from "@/services/magazine.service";
import type {
  MagazineDeleteResult,
  MagazineMutationResult,
} from "@/types/magazine";

const magazineIdSchema = z.string().trim().min(1).max(64);

function mapServiceError(error: unknown): MagazineMutationResult {
  if (error instanceof MagazineServiceError) {
    return {
      ok: false,
      message: error.message,
      ...(error.field ? { fieldErrors: { [error.field]: [error.message] } } : {}),
    };
  }

  return {
    ok: false,
    message: "The magazine issue could not be saved. Please try again.",
  };
}

export async function createMagazineAction(
  input: unknown,
): Promise<MagazineMutationResult> {
  const user = await requireAdmin();
  const parsed = magazineFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const issue = await createMagazineIssue(
      { id: user.id, role: user.role },
      parsed.data,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/magazine");
    return { ok: true, id: issue.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function updateMagazineAction(
  id: string,
  input: unknown,
): Promise<MagazineMutationResult> {
  const user = await requireAdmin();
  const parsedId = magazineIdSchema.safeParse(id);
  const parsed = magazineFormSchema.safeParse(input);

  if (!parsedId.success) {
    return { ok: false, message: "Magazine issue not found." };
  }
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const issue = await updateMagazineIssue(
      { id: user.id, role: user.role },
      parsedId.data,
      parsed.data,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/magazine");
    revalidatePath(`/admin/magazine/${issue.id}/edit`);
    return { ok: true, id: issue.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function deleteMagazineAction(
  id: string,
): Promise<MagazineDeleteResult> {
  const user = await requireAdmin();
  const parsedId = magazineIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: "Magazine issue not found." };
  }

  try {
    await deleteMagazineIssue(
      { id: user.id, role: user.role },
      parsedId.data,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/magazine");
    return { ok: true };
  } catch (error) {
    if (error instanceof MagazineServiceError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "The magazine issue could not be deleted. Please try again.",
    };
  }
}
