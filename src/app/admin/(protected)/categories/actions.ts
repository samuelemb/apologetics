"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { categoryFormSchema } from "@/schemas/category";
import {
  CategoryServiceError,
  createCategory,
  deleteCategory,
  setCategoryActive,
  updateCategory,
} from "@/services/category.service";
import type {
  CategoryActionResult,
  CategoryMutationResult,
} from "@/types/category";

const categoryIdSchema = z.string().trim().min(1).max(64);

function revalidateCategoryDependencies(id?: string): void {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/categories/new");
  if (id) revalidatePath(`/admin/categories/${id}/edit`);
  revalidatePath("/admin/news");
  revalidatePath("/admin/news/new");
  revalidatePath("/admin/news/[id]/edit", "page");
  revalidatePath("/admin/events");
  revalidatePath("/admin/events/new");
  revalidatePath("/admin/events/[id]/edit", "page");
  revalidatePath("/admin/magazine");
  revalidatePath("/admin/magazine/new");
  revalidatePath("/admin/magazine/[id]/edit", "page");
}

function mapServiceError(error: unknown): CategoryMutationResult {
  if (error instanceof CategoryServiceError) {
    return {
      ok: false,
      message: error.message,
      ...(error.field ? { fieldErrors: { [error.field]: [error.message] } } : {}),
    };
  }
  return { ok: false, message: "The category could not be saved. Please try again." };
}

export async function createCategoryAction(
  input: unknown,
): Promise<CategoryMutationResult> {
  const user = await requireAdmin();
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const category = await createCategory(
      { id: user.id, role: user.role },
      parsed.data,
    );
    revalidateCategoryDependencies(category.id);
    return { ok: true, id: category.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function updateCategoryAction(
  id: string,
  input: unknown,
): Promise<CategoryMutationResult> {
  const user = await requireAdmin();
  const parsedId = categoryIdSchema.safeParse(id);
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, message: "Category not found." };
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const category = await updateCategory(
      { id: user.id, role: user.role },
      parsedId.data,
      parsed.data,
    );
    revalidateCategoryDependencies(category.id);
    return { ok: true, id: category.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function setCategoryActiveAction(
  id: string,
  isActive: boolean,
): Promise<CategoryActionResult> {
  const user = await requireAdmin();
  const parsedId = categoryIdSchema.safeParse(id);
  const parsedActive = z.boolean().safeParse(isActive);
  if (!parsedId.success || !parsedActive.success) {
    return { ok: false, message: "Category not found." };
  }

  try {
    await setCategoryActive(
      { id: user.id, role: user.role },
      parsedId.data,
      parsedActive.data,
    );
    revalidateCategoryDependencies(parsedId.data);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof CategoryServiceError
          ? error.message
          : "The category status could not be changed.",
    };
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<CategoryActionResult> {
  const user = await requireAdmin();
  const parsedId = categoryIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Category not found." };

  try {
    await deleteCategory({ id: user.id, role: user.role }, parsedId.data);
    revalidateCategoryDependencies();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof CategoryServiceError
          ? error.message
          : "The category could not be deleted.",
    };
  }
}
