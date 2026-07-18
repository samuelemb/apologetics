import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canAccessCategoryAdmin,
  canCreateCategory,
  canDeleteCategory,
  canEditCategory,
  canSetCategoryActive,
} from "@/lib/category-policy";
import {
  normalizeCategoryInput,
  type CategoryFormInput,
  type CategoryQuery,
} from "@/schemas/category";
import type { CategoryActor, CategoryEditValues } from "@/types/category";

const CATEGORY_PAGE_SIZE = 10;

export class CategoryServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "DUPLICATE_SLUG"
      | "REFERENCED",
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "CategoryServiceError";
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

function assertAccess(actor: CategoryActor): void {
  if (!canAccessCategoryAdmin(actor.role)) {
    throw new CategoryServiceError(
      "FORBIDDEN",
      "You do not have permission to manage categories.",
    );
  }
}

export async function listCategories(actor: CategoryActor, query: CategoryQuery) {
  assertAccess(actor);

  const where: Prisma.CategoryWhereInput = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { slug: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.active ? { isActive: query.active === "true" } : {}),
  };
  const orderBy: Prisma.CategoryOrderByWithRelationInput =
    query.sort === "alphabetical"
      ? { name: "asc" }
      : { createdAt: query.sort === "oldest" ? "asc" : "desc" };
  const skip = (query.page - 1) * CATEGORY_PAGE_SIZE;

  const [total, categories] = await prisma.$transaction([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy,
      skip,
      take: CATEGORY_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            newsArticles: true,
            events: true,
            magazineIssues: true,
          },
        },
      },
    }),
  ]);

  return {
    categories,
    total,
    page: query.page,
    pageSize: CATEGORY_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE)),
  };
}

export async function getCategoryForEdit(
  actor: CategoryActor,
  id: string,
): Promise<CategoryEditValues | null> {
  assertAccess(actor);
  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      type: true,
      isActive: true,
    },
  });

  return category ? { ...category, description: category.description ?? "" } : null;
}

export async function createCategory(
  actor: CategoryActor,
  input: CategoryFormInput,
) {
  if (!canCreateCategory(actor.role)) {
    assertAccess(actor);
  }
  const normalized = normalizeCategoryInput(input);

  try {
    return await prisma.category.create({
      data: normalized,
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function updateCategory(
  actor: CategoryActor,
  id: string,
  input: CategoryFormInput,
) {
  if (!canEditCategory(actor.role)) {
    assertAccess(actor);
  }
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new CategoryServiceError("NOT_FOUND", "Category not found.");
  }

  try {
    return await prisma.category.update({
      where: { id },
      data: normalizeCategoryInput(input),
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryServiceError(
        "DUPLICATE_SLUG",
        "This slug is already in use.",
        "slug",
      );
    }
    throw error;
  }
}

export async function setCategoryActive(
  actor: CategoryActor,
  id: string,
  isActive: boolean,
): Promise<void> {
  if (!canSetCategoryActive(actor.role)) {
    assertAccess(actor);
  }
  const updated = await prisma.category.updateMany({
    where: { id },
    data: { isActive },
  });
  if (!updated.count) {
    throw new CategoryServiceError("NOT_FOUND", "Category not found.");
  }
}

export async function deleteCategory(
  actor: CategoryActor,
  id: string,
): Promise<void> {
  if (!canDeleteCategory(actor.role)) {
    throw new CategoryServiceError(
      "FORBIDDEN",
      "You do not have permission to permanently delete categories.",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      const category = await transaction.category.findUnique({
        where: { id },
        select: {
          id: true,
          _count: {
            select: {
              newsArticles: true,
              events: true,
              magazineIssues: true,
            },
          },
        },
      });
      if (!category) {
        throw new CategoryServiceError("NOT_FOUND", "Category not found.");
      }

      const usage =
        category._count.newsArticles +
        category._count.events +
        category._count.magazineIssues;
      if (usage > 0) {
        throw new CategoryServiceError(
          "REFERENCED",
          "This category is in use. Deactivate it instead of deleting it.",
        );
      }

      await transaction.category.delete({ where: { id } });
    },
    { isolationLevel: "Serializable" },
  );
}
