"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { tagFormSchema } from "@/schemas/tag";
import {
  TagServiceError,
  createTag,
  deleteTag,
  setTagActive,
  updateTag,
} from "@/services/tag.service";
import type { TagActionResult, TagMutationResult } from "@/types/tag";

const tagIdSchema = z.string().trim().min(1).max(64);

function revalidateTagDependencies(id?: string): void {
  revalidatePath("/admin/tags");
  revalidatePath("/admin/tags/new");
  if (id) revalidatePath(`/admin/tags/${id}/edit`);
  revalidatePath("/admin/news/new");
  revalidatePath("/admin/news/[id]/edit", "page");
  revalidatePath("/admin/events/new");
  revalidatePath("/admin/events/[id]/edit", "page");
  revalidatePath("/admin/magazine/new");
  revalidatePath("/admin/magazine/[id]/edit", "page");
}

function mapServiceError(error: unknown): TagMutationResult {
  if (error instanceof TagServiceError) {
    return {
      ok: false,
      message: error.message,
      ...(error.field ? { fieldErrors: { [error.field]: [error.message] } } : {}),
    };
  }
  return { ok: false, message: "The tag could not be saved. Please try again." };
}

export async function createTagAction(input: unknown): Promise<TagMutationResult> {
  const user = await requireAdmin();
  const parsed = tagFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tag = await createTag({ id: user.id, role: user.role }, parsed.data);
    revalidateTagDependencies(tag.id);
    return { ok: true, id: tag.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function updateTagAction(
  id: string,
  input: unknown,
): Promise<TagMutationResult> {
  const user = await requireAdmin();
  const parsedId = tagIdSchema.safeParse(id);
  const parsed = tagFormSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, message: "Tag not found." };
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tag = await updateTag(
      { id: user.id, role: user.role },
      parsedId.data,
      parsed.data,
    );
    revalidateTagDependencies(tag.id);
    return { ok: true, id: tag.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function setTagActiveAction(
  id: string,
  isActive: boolean,
): Promise<TagActionResult> {
  const user = await requireAdmin();
  const parsedId = tagIdSchema.safeParse(id);
  const parsedActive = z.boolean().safeParse(isActive);
  if (!parsedId.success || !parsedActive.success) {
    return { ok: false, message: "Tag not found." };
  }

  try {
    await setTagActive(
      { id: user.id, role: user.role },
      parsedId.data,
      parsedActive.data,
    );
    revalidateTagDependencies(parsedId.data);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof TagServiceError
          ? error.message
          : "The tag status could not be changed.",
    };
  }
}

export async function deleteTagAction(id: string): Promise<TagActionResult> {
  const user = await requireAdmin();
  const parsedId = tagIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Tag not found." };

  try {
    await deleteTag({ id: user.id, role: user.role }, parsedId.data);
    revalidateTagDependencies();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof TagServiceError
          ? error.message
          : "The tag could not be deleted.",
    };
  }
}
