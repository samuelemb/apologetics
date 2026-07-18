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
import { DeleteNewsButton } from "@/components/admin/delete-news-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ContentStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import {
  canCreateNews,
  canDeleteNews,
  canEditNews,
} from "@/lib/news-policy";
import { cn } from "@/lib/utils";
import { newsQuerySchema, type NewsQuery } from "@/schemas/news";
import { getNewsFormOptions, listNews } from "@/services/news.service";

type SearchParams = Record<string, string | string[] | undefined>;

function buildPageHref(query: NewsQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  params.set("sort", query.sort);
  return `/admin/news?${params.toString()}`;
}

function formatDate(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value)
    : "--";
}

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAdmin();
  const rawSearchParams = await searchParams;
  const parsedQuery = newsQuerySchema.safeParse(rawSearchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : newsQuerySchema.parse({});
  const [listing, options] = await Promise.all([
    listNews(query),
    getNewsFormOptions(),
  ]);
  const hasFilters = Boolean(
    query.search || query.status || query.category || query.sort !== "newest",
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="News"
        description={`Manage and organize ${listing.total} news article${listing.total === 1 ? "" : "s"}.`}
        actions={
          canCreateNews(user.role) ? (
            <Link href="/admin/news/new" className={adminPrimaryActionClass}>
              <Plus aria-hidden="true" />
              New article
            </Link>
          ) : undefined
        }
      />

      <AdminFilterBar>
        <AdminSearchField
          name="search"
          defaultValue={query.search}
          placeholder="Search news..."
          label="Search news by title"
          className="lg:min-w-72"
        />
        <Select
          name="status"
          defaultValue={query.status ?? ""}
          aria-label="Filter by status"
          className={adminControlClass}
        >
          <option value="">All statuses</option>
          {Object.values(ContentStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select
          name="category"
          defaultValue={query.category ?? ""}
          aria-label="Filter by category"
          className={adminControlClass}
        >
          <option value="">All categories</option>
          {options.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          name="sort"
          defaultValue={query.sort}
          aria-label="Sort news"
          className={adminControlClass}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </Select>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="h-[var(--admin-control-height)] rounded-[var(--admin-radius)] px-5"
        >
          Apply filters
        </Button>
      </AdminFilterBar>

      {!parsedQuery.success ? (
        <p className="text-sm font-medium text-admin-danger" role="alert">
          Invalid filters were ignored.
        </p>
      ) : null}

      <AdminTableCard
        emptyState={
          !listing.articles.length ? (
            <AdminEmptyState
              title="No news articles found"
              description="No news articles match the selected filters."
              resetHref={hasFilters ? "/admin/news" : undefined}
            />
          ) : undefined
        }
        footer={
          listing.articles.length ? (
            <AdminPagination
              summary={`${listing.total} article${listing.total === 1 ? "" : "s"}`}
              page={listing.page}
              totalPages={listing.totalPages}
              previousHref={
                listing.page > 1
                  ? buildPageHref(query, listing.page - 1)
                  : undefined
              }
              nextHref={
                listing.page < listing.totalPages
                  ? buildPageHref(query, listing.page + 1)
                  : undefined
              }
            />
          ) : undefined
        }
      >
        {listing.articles.length ? (
          <table className="w-full min-w-[1040px] text-left">
            <thead className="border-b border-admin-border bg-admin-background/80">
              <tr>
                <th scope="col" className={adminTableHeaderCellClass}>Title</th>
                <th scope="col" className={adminTableHeaderCellClass}>Category</th>
                <th scope="col" className={adminTableHeaderCellClass}>Author</th>
                <th scope="col" className={adminTableHeaderCellClass}>Status</th>
                <th scope="col" className={adminTableHeaderCellClass}>Featured</th>
                <th scope="col" className={adminTableHeaderCellClass}>Published</th>
                <th scope="col" className={adminTableHeaderCellClass}>Updated</th>
                <th scope="col" className={cn(adminTableHeaderCellClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {listing.articles.map((article) => {
                const editable = canEditNews(user.role, user.id, article.authorId);

                return (
                  <tr key={article.id} className="transition-colors hover:bg-admin-background/70">
                    <td className={cn(adminTableCellClass, "max-w-sm")}> 
                      <div className="flex items-center gap-3">
                        <AdminThumbnail alt="News article placeholder" kind="news" />
                        <span className="line-clamp-2 font-semibold">{article.title}</span>
                      </div>
                    </td>
                    <td className={adminTableCellClass}>
                      {article.category?.name ? (
                        <AdminBadge label={article.category.name} tone="primary" />
                      ) : (
                        <span className="text-admin-muted-text">--</span>
                      )}
                    </td>
                    <td className={cn(adminTableCellClass, "text-admin-muted-text")}>{article.author?.name ?? "--"}</td>
                    <td className={adminTableCellClass}><AdminStatusBadge status={article.status} /></td>
                    <td className={adminTableCellClass}>
                      <AdminBadge label={article.featured ? "Yes" : "No"} tone={article.featured ? "info" : "neutral"} />
                    </td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(article.publishedAt)}</td>
                    <td className={cn(adminTableCellClass, "whitespace-nowrap text-admin-muted-text")}>{formatDate(article.updatedAt)}</td>
                    <td className={adminTableCellClass}>
                      <div className="flex justify-end gap-2">
                        {editable ? (
                          <Link
                            href={`/admin/news/${article.id}/edit`}
                            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md")}
                          >
                            <Edit3 aria-hidden="true" />
                            Edit
                          </Link>
                        ) : null}
                        {canDeleteNews(user.role) ? (
                          <DeleteNewsButton id={article.id} title={article.title} />
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
