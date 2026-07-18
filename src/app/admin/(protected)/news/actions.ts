"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { newsFormSchema } from "@/schemas/news";
import {
  createNews,
  deleteNews,
  NewsServiceError,
  updateNews,
} from "@/services/news.service";
import type { NewsDeleteResult, NewsMutationResult } from "@/types/news";

const newsIdSchema = z.string().trim().min(1).max(64);

function mapServiceError(error: unknown): NewsMutationResult {
  if (error instanceof NewsServiceError) {
    return {
      ok: false,
      message: error.message,
      ...(error.field ? { fieldErrors: { [error.field]: [error.message] } } : {}),
    };
  }

  return {
    ok: false,
    message: "The article could not be saved. Please try again.",
  };
}

export async function createNewsAction(input: unknown): Promise<NewsMutationResult> {
  const user = await requireAdmin();
  const parsed = newsFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const article = await createNews(
      { id: user.id, role: user.role },
      parsed.data,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/news");
    return { ok: true, id: article.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function updateNewsAction(
  id: string,
  input: unknown,
): Promise<NewsMutationResult> {
  const user = await requireAdmin();
  const parsedId = newsIdSchema.safeParse(id);
  const parsed = newsFormSchema.safeParse(input);

  if (!parsedId.success) {
    return { ok: false, message: "News article not found." };
  }
  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const article = await updateNews(
      { id: user.id, role: user.role },
      parsedId.data,
      parsed.data,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/news");
    revalidatePath(`/admin/news/${article.id}/edit`);
    return { ok: true, id: article.id };
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function deleteNewsAction(id: string): Promise<NewsDeleteResult> {
  const user = await requireAdmin();
  const parsedId = newsIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, message: "News article not found." };
  }

  try {
    await deleteNews({ id: user.id, role: user.role }, parsedId.data);
    revalidatePath("/admin");
    revalidatePath("/admin/news");
    return { ok: true };
  } catch (error) {
    if (error instanceof NewsServiceError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "The article could not be deleted. Please try again.",
    };
  }
}
