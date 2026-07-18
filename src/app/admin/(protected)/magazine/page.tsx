import { Edit3, Plus } from "lucide-react";
import Link from "next/link";

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
import { AdminThumbnail } from "@/components/admin/admin-listing-media";
import { DeleteMagazineButton } from "@/components/admin/delete-magazine-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ContentStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canCreateMagazine,
  canDeleteMagazine,
  canEditMagazine,
} from "@/lib/magazine-policy";
import { cn } from "@/lib/utils";
import { magazineQuerySchema, type MagazineQuery } from "@/schemas/magazine";
import {
  getMagazineFormOptions,
  listMagazineIssues,
} from "@/services/magazine.service";

type SearchParams = Record<string, string | string[] | undefined>;

const magazineStatuses = [
  ContentStatus.DRAFT,
  ContentStatus.PUBLISHED,
  ContentStatus.ARCHIVED,
];

function buildPageHref(query: MagazineQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.featured) params.set("featured", query.featured);
  params.set("sort", query.sort);
  return `/admin/magazine?${params.toString()}`;
}

function formatDate(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(value)
    : "--";
}

export default async function AdminMagazinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAdmin();
  const rawSearchParams = await searchParams;
  const parsedQuery = magazineQuerySchema.safeParse(rawSearchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : magazineQuerySchema.parse({});
  const [listing, options] = await Promise.all([
    listMagazineIssues(query),
    getMagazineFormOptions(),
  ]);
  const hasFilters = Boolean(
    query.search || query.status || query.category || query.featured || query.sort !== "newest",
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="Magazine"
        description={`Manage and organize ${listing.total} magazine issue${listing.total === 1 ? "" : "s"}.`}
        actions={
          canCreateMagazine(user.role) ? (
            <Link href="/admin/magazine/new" className={adminPrimaryActionClass}>
              <Plus aria-hidden="true" />
              New issue
            </Link>
          ) : undefined
        }
      />

      <AdminFilterBar>
        <AdminSearchField
          name="search"
          defaultValue={query.search}
          placeholder="Search magazine..."
          label="Search magazine issues by title"
          className="lg:min-w-64"
        />
        <Select name="status" defaultValue={query.status ?? ""} aria-label="Filter by status" className={adminControlClass}>
          <option value="">All statuses</option>
          {magazineStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
        <Select name="category" defaultValue={query.category ?? ""} aria-label="Filter by category" className={adminControlClass}>
          <option value="">All categories</option>
          {options.categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </Select>
        <Select name="featured" defaultValue={query.featured ?? ""} aria-label="Filter by featured state" className={adminControlClass}>
          <option value="">All issues</option>
          <option value="true">Featured</option>
          <option value="false">Not featured</option>
        </Select>
        <Select name="sort" defaultValue={query.sort} aria-label="Sort magazine issues" className={adminControlClass}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="publication">Publication date</option>
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
          !listing.issues.length ? (
            <AdminEmptyState
              title="No magazine issues found"
              description="No magazine issues match the selected filters."
              resetHref={hasFilters ? "/admin/magazine" : undefined}
            />
          ) : undefined
        }
        footer={
          listing.issues.length ? (
            <AdminPagination
              summary={`${listing.total} issue${listing.total === 1 ? "" : "s"}`}
              page={listing.page}
              totalPages={listing.totalPages}
              previousHref={listing.page > 1 ? buildPageHref(query, listing.page - 1) : undefined}
              nextHref={listing.page < listing.totalPages ? buildPageHref(query, listing.page + 1) : undefined}
            />
          ) : undefined
        }
      >
        {listing.issues.length ? (
          <table className="w-full min-w-[1500px] text-left">
            <thead className="border-b border-admin-border bg-admin-background/80">
              <tr>
                <th scope="col" className={adminTableHeaderCellClass}>Issue</th>
                <th scope="col" className={adminTableHeaderCellClass}>Number</th>
                <th scope="col" className={adminTableHeaderCellClass}>Volume</th>
                <th scope="col" className={adminTableHeaderCellClass}>Category</th>
                <th scope="col" className={adminTableHeaderCellClass}>Author</th>
                <th scope="col" className={adminTableHeaderCellClass}>Status</th>
                <th scope="col" className={adminTableHeaderCellClass}>Featured</th>
                <th scope="col" className={adminTableHeaderCellClass}>Publication</th>
                <th scope="col" className={adminTableHeaderCellClass}>Views</th>
                <th scope="col" className={adminTableHeaderCellClass}>Downloads</th>
                <th scope="col" className={adminTableHeaderCellClass}>Updated</th>
                <th scope="col" className={cn(adminTableHeaderCellClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {listing.issues.map((issue) => {
                const editable = canEditMagazine(user.role, user.id, issue.authorId, issue.status);

                return (
                  <tr key={issue.id} className="transition-colors hover:bg-admin-background/70">
                    <td className={cn(adminTableCellClass, "max-w-sm")}>
                      <div className="flex items-center gap-3">
                        <AdminThumbnail
                          src={issue.coverImageUrl}
                          alt={issue.coverImageAlt || `${issue.title} cover`}
                          kind="magazine"
                          className="h-16 w-12"
                        />
                        <span className="line-clamp-2 font-semibold">{issue.title}</span>
                      </div>
                    </td>
                    <td className={cn(adminTableCellClass, "font-medium")}>{issue.issueNumber}</td>
                    <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{issue.volume ?? "--"}</td>
                    <td className={adminTableCellClass}>
                      {issue.category?.name ? <AdminBadge label={issue.category.name} tone="primary" /> : <span className="text-admin-muted-text">--</span>}
                    </td>
                    <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{issue.author?.name ?? "--"}</td>
                    <td className={adminTableCellClass}><AdminStatusBadge status={issue.status} /></td>
                    <td className={adminTableCellClass}><AdminBadge label={issue.featured ? "Yes" : "No"} tone={issue.featured ? "info" : "neutral"} /></td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(issue.publicationDate)}</td>
                    <td className={cn(adminTableCellClass, "tabular-nums")}>{issue.viewCount}</td>
                    <td className={cn(adminTableCellClass, "tabular-nums")}>{issue.downloadCount}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(issue.updatedAt)}</td>
                    <td className={adminTableCellClass}>
                      <div className="flex justify-end gap-2">
                        {editable ? (
                          <Link href={`/admin/magazine/${issue.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md")}>
                            <Edit3 aria-hidden="true" />
                            Edit
                          </Link>
                        ) : null}
                        {canDeleteMagazine(user.role) ? (
                          <DeleteMagazineButton id={issue.id} title={issue.title} issueNumber={issue.issueNumber} />
                        ) : null}
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
