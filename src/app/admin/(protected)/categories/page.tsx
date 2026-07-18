import { Edit3, Plus, Shapes } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AdminBadge,
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSearchField,
  AdminStatusBadge,
  AdminTableCard,
  adminControlClass,
  adminPrimaryActionClass,
  adminTableCellClass,
  adminTableHeaderCellClass,
} from "@/components/admin/admin-listing";
import { CategoryRowActions } from "@/components/admin/category-row-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CategoryType } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessCategoryAdmin,
  canCreateCategory,
  canDeleteCategory,
  canEditCategory,
} from "@/lib/category-policy";
import { cn } from "@/lib/utils";
import { categoryQuerySchema, type CategoryQuery } from "@/schemas/category";
import { listCategories } from "@/services/category.service";

type SearchParams = Record<string, string | string[] | undefined>;

function buildPageHref(query: CategoryQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (query.search) params.set("search", query.search);
  if (query.type) params.set("type", query.type);
  if (query.active) params.set("active", query.active);
  params.set("sort", query.sort);
  return `/admin/categories?${params.toString()}`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

function getCategoryTone(type: CategoryType) {
  switch (type) {
    case CategoryType.NEWS:
      return "primary" as const;
    case CategoryType.EVENT:
      return "warning" as const;
    case CategoryType.MAGAZINE:
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAdmin();
  if (!canAccessCategoryAdmin(user.role)) redirect("/admin?error=forbidden");

  const rawSearchParams = await searchParams;
  const parsedQuery = categoryQuerySchema.safeParse(rawSearchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : categoryQuerySchema.parse({});
  const listing = await listCategories({ id: user.id, role: user.role }, query);
  const hasFilters = Boolean(
    query.search || query.type || query.active || query.sort !== "newest",
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="Categories"
        description={`Manage and organize ${listing.total} categor${listing.total === 1 ? "y" : "ies"}.`}
        actions={
          canCreateCategory(user.role) ? (
            <Link href="/admin/categories/new" className={adminPrimaryActionClass}>
              <Plus aria-hidden="true" />
              New category
            </Link>
          ) : undefined
        }
      />

      <AdminFilterBar>
        <AdminSearchField
          name="search"
          defaultValue={query.search}
          placeholder="Search categories..."
          label="Search categories by name or slug"
          className="lg:min-w-72"
        />
        <Select name="type" defaultValue={query.type ?? ""} aria-label="Filter by type" className={adminControlClass}>
          <option value="">All types</option>
          {Object.values(CategoryType).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        <Select name="active" defaultValue={query.active ?? ""} aria-label="Filter by active status" className={adminControlClass}>
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Select name="sort" defaultValue={query.sort} aria-label="Sort categories" className={adminControlClass}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="alphabetical">Alphabetical</option>
        </Select>
        <Button type="submit" variant="outline" size="lg" className="h-[var(--admin-control-height)] rounded-[var(--admin-radius)] px-5">
          Apply filters
        </Button>
      </AdminFilterBar>

      {!parsedQuery.success ? (
        <p className="text-sm font-medium text-admin-danger" role="alert">Invalid filters were ignored.</p>
      ) : null}

      <AdminTableCard
        emptyState={
          !listing.categories.length ? (
            <AdminEmptyState
              title="No categories found"
              description="No categories match the selected filters."
              resetHref={hasFilters ? "/admin/categories" : undefined}
            />
          ) : undefined
        }
        footer={
          listing.categories.length ? (
            <AdminPagination
              summary={`${listing.total} categor${listing.total === 1 ? "y" : "ies"}`}
              page={listing.page}
              totalPages={listing.totalPages}
              previousHref={listing.page > 1 ? buildPageHref(query, listing.page - 1) : undefined}
              nextHref={listing.page < listing.totalPages ? buildPageHref(query, listing.page + 1) : undefined}
            />
          ) : undefined
        }
      >
        {listing.categories.length ? (
          <table className="w-full min-w-[1280px] text-left">
            <thead className="border-b border-admin-border bg-admin-background/80">
              <tr>
                <th scope="col" className={adminTableHeaderCellClass}>Name</th>
                <th scope="col" className={adminTableHeaderCellClass}>Slug</th>
                <th scope="col" className={adminTableHeaderCellClass}>Description</th>
                <th scope="col" className={adminTableHeaderCellClass}>Type</th>
                <th scope="col" className={adminTableHeaderCellClass}>Status</th>
                <th scope="col" className={adminTableHeaderCellClass}>News</th>
                <th scope="col" className={adminTableHeaderCellClass}>Events</th>
                <th scope="col" className={adminTableHeaderCellClass}>Magazine</th>
                <th scope="col" className={adminTableHeaderCellClass}>Created</th>
                <th scope="col" className={adminTableHeaderCellClass}>Updated</th>
                <th scope="col" className={cn(adminTableHeaderCellClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {listing.categories.map((category) => (
                <tr key={category.id} className="transition-colors hover:bg-admin-background/70">
                  <td className={adminTableCellClass}>
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-admin-primary-soft text-admin-primary">
                        <Shapes aria-hidden="true" className="size-5" />
                      </span>
                      <span className="font-semibold">{category.name}</span>
                    </div>
                  </td>
                  <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{category.slug}</td>
                  <td className={cn(adminTableCellClass, "max-w-xs text-admin-muted-text")}><span className="line-clamp-2">{category.description || "--"}</span></td>
                  <td className={adminTableCellClass}><AdminBadge label={category.type} tone={getCategoryTone(category.type)} /></td>
                  <td className={adminTableCellClass}><AdminStatusBadge status={category.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  <td className={cn(adminTableCellClass, "tabular-nums")}>{category._count.newsArticles}</td>
                  <td className={cn(adminTableCellClass, "tabular-nums")}>{category._count.events}</td>
                  <td className={cn(adminTableCellClass, "tabular-nums")}>{category._count.magazineIssues}</td>
                  <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(category.createdAt)}</td>
                  <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(category.updatedAt)}</td>
                  <td className={adminTableCellClass}>
                    <div className="flex flex-wrap justify-end gap-2">
                      {canEditCategory(user.role) ? (
                        <Link href={`/admin/categories/${category.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md")}>
                          <Edit3 aria-hidden="true" />
                          Edit
                        </Link>
                      ) : null}
                      <CategoryRowActions id={category.id} name={category.name} isActive={category.isActive} canDelete={canDeleteCategory(user.role)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : undefined}
      </AdminTableCard>
    </div>
  );
}
