import { Edit3, Plus, Tag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
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
import { TagRowActions } from "@/components/admin/tag-row-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canAccessTagAdmin,
  canCreateTag,
  canDeleteTag,
  canEditTag,
} from "@/lib/tag-policy";
import { cn } from "@/lib/utils";
import { tagQuerySchema, type TagQuery } from "@/schemas/tag";
import { listTags } from "@/services/tag.service";

type SearchParams = Record<string, string | string[] | undefined>;

function buildPageHref(query: TagQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (query.search) params.set("search", query.search);
  if (query.active) params.set("active", query.active);
  if (query.usage) params.set("usage", query.usage);
  params.set("sort", query.sort);
  return `/admin/tags?${params.toString()}`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

export default async function AdminTagsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAdmin();
  if (!canAccessTagAdmin(user.role)) redirect("/admin?error=forbidden");

  const rawSearchParams = await searchParams;
  const parsedQuery = tagQuerySchema.safeParse(rawSearchParams);
  const query = parsedQuery.success ? parsedQuery.data : tagQuerySchema.parse({});
  const listing = await listTags({ id: user.id, role: user.role }, query);
  const hasFilters = Boolean(
    query.search || query.active || query.usage || query.sort !== "newest",
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="Tags"
        description={`Manage and organize ${listing.total} tag${listing.total === 1 ? "" : "s"}.`}
        actions={
          canCreateTag(user.role) ? (
            <Link href="/admin/tags/new" className={adminPrimaryActionClass}>
              <Plus aria-hidden="true" />
              New tag
            </Link>
          ) : undefined
        }
      />

      <AdminFilterBar>
        <AdminSearchField
          name="search"
          defaultValue={query.search}
          placeholder="Search tags..."
          label="Search tags by name or slug"
          className="lg:min-w-72"
        />
        <Select name="active" defaultValue={query.active ?? ""} aria-label="Filter by active status" className={adminControlClass}>
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Select name="usage" defaultValue={query.usage ?? ""} aria-label="Filter by usage" className={adminControlClass}>
          <option value="">All usage</option>
          <option value="used">Used</option>
          <option value="unused">Unused</option>
        </Select>
        <Select name="sort" defaultValue={query.sort} aria-label="Sort tags" className={adminControlClass}>
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
          !listing.tags.length ? (
            <AdminEmptyState
              title="No tags found"
              description="No tags match the selected filters."
              resetHref={hasFilters ? "/admin/tags" : undefined}
            />
          ) : undefined
        }
        footer={
          listing.tags.length ? (
            <AdminPagination
              summary={`${listing.total} tag${listing.total === 1 ? "" : "s"}`}
              page={listing.page}
              totalPages={listing.totalPages}
              previousHref={listing.page > 1 ? buildPageHref(query, listing.page - 1) : undefined}
              nextHref={listing.page < listing.totalPages ? buildPageHref(query, listing.page + 1) : undefined}
            />
          ) : undefined
        }
      >
        {listing.tags.length ? (
          <table className="w-full min-w-[1240px] text-left">
            <thead className="border-b border-admin-border bg-admin-background/80">
              <tr>
                <th scope="col" className={adminTableHeaderCellClass}>Name</th>
                <th scope="col" className={adminTableHeaderCellClass}>Slug</th>
                <th scope="col" className={adminTableHeaderCellClass}>Description</th>
                <th scope="col" className={adminTableHeaderCellClass}>Status</th>
                <th scope="col" className={adminTableHeaderCellClass}>News</th>
                <th scope="col" className={adminTableHeaderCellClass}>Events</th>
                <th scope="col" className={adminTableHeaderCellClass}>Magazine</th>
                <th scope="col" className={adminTableHeaderCellClass}>Total</th>
                <th scope="col" className={adminTableHeaderCellClass}>Created</th>
                <th scope="col" className={adminTableHeaderCellClass}>Updated</th>
                <th scope="col" className={cn(adminTableHeaderCellClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {listing.tags.map((tag) => {
                const total = tag._count.newsArticles + tag._count.events + tag._count.magazineIssues;

                return (
                  <tr key={tag.id} className="transition-colors hover:bg-admin-background/70">
                    <td className={adminTableCellClass}>
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-admin-success">
                          <Tag aria-hidden="true" className="size-5" />
                        </span>
                        <span className="font-semibold">{tag.name}</span>
                      </div>
                    </td>
                    <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{tag.slug}</td>
                    <td className={cn(adminTableCellClass, "max-w-xs text-admin-muted-text")}><span className="line-clamp-2">{tag.description || "--"}</span></td>
                    <td className={adminTableCellClass}><AdminStatusBadge status={tag.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                    <td className={cn(adminTableCellClass, "tabular-nums")}>{tag._count.newsArticles}</td>
                    <td className={cn(adminTableCellClass, "tabular-nums")}>{tag._count.events}</td>
                    <td className={cn(adminTableCellClass, "tabular-nums")}>{tag._count.magazineIssues}</td>
                    <td className={cn(adminTableCellClass, "font-semibold tabular-nums")}>{total}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(tag.createdAt)}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(tag.updatedAt)}</td>
                    <td className={adminTableCellClass}>
                      <div className="flex flex-wrap justify-end gap-2">
                        {canEditTag(user.role) ? (
                          <Link href={`/admin/tags/${tag.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md")}>
                            <Edit3 aria-hidden="true" />
                            Edit
                          </Link>
                        ) : null}
                        <TagRowActions id={tag.id} name={tag.name} isActive={tag.isActive} canDelete={canDeleteTag(user.role)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : undefined}
      </AdminTableCard>
    </div>
  );
}
